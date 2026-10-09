"""Pygame implementacija solo bilijara sa jednostavnom 2D fizikom."""

import math
import sys
import pygame


BG = (16, 19, 29)
PANEL = (23, 28, 41)
TEXT = (244, 246, 255)
MUTED = (174, 184, 208)
ACCENT = (125, 211, 252)
ERROR = (251, 113, 133)
SUCCESS = (74, 222, 128)
FELT = (23, 107, 74)
RAIL = (112, 69, 47)
RADIUS = 12
POCKET_RADIUS = 27
ROLLING_DRAG = 1.45
BALL_RESTITUTION = 0.96
RAIL_RESTITUTION = 0.82
STOP_SPEED = 8.0
MIN_POWER = 180.0
MAX_POWER = 1650.0
BALL_COLORS = [
    (250, 204, 21), (37, 99, 235), (239, 68, 68), (124, 58, 237),
    (249, 115, 22), (22, 163, 74), (190, 18, 60), (17, 24, 39),
    (250, 204, 21), (37, 99, 235), (239, 68, 68), (124, 58, 237),
    (249, 115, 22), (22, 163, 74), (190, 18, 60),
]


class BilliardsGame:
    """Crta bilijarski sto i simulira udarce, sudare i džepove kugli."""

    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Bilijar | Mini Games by Djordan")
        self.screen = pygame.display.set_mode((1280, 820), pygame.FULLSCREEN)
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("segoeui", 23)
        self.small = pygame.font.SysFont("segoeui", 17)
        self.heading = pygame.font.SysFont("segoeui", 44, bold=True)
        self.state = "setup"
        self.name_text = ""
        self.second_name_text = ""
        self.mode = "computer"
        self.active_input = 0
        self.player_name = "Igrač"
        self.message = ""
        self.balls = []
        self.cue = None
        self.dragging = False
        self.animating = False
        self.sunk = 0
        self.groups = [None, None]
        self.current_player = 0
        self.shot_sunk = []
        self.scratched = False
        self.ai_due = None
        self.winner = None
        self.black_sunk = False
        self.first_contact_group = None
        self.shot_legal_group = None
        self.potted_by_group = {"solid": [], "stripe": [], "black": []}
        self.cue_offset = (0.0, 0.0)
        self.physics_accumulator = 0.0
        self.cue_stick_pull = 0.0
        self.shot_stick_time = 0.0
        self.stick_direction = (1.0, 0.0)
        self.prediction_cache_key = None
        self.prediction_cache = None

    def text(self, value, position, color=TEXT, font=None, center=False):
        """Nacrtaj tekst u gornjem levom uglu ili centriran oko koordinate."""
        image = (font or self.font).render(value, True, color)
        rect = image.get_rect(center=position) if center else image.get_rect(topleft=position)
        self.screen.blit(image, rect)

    def button(self, rect, label, mouse, primary=False):
        """Nacrtaj dugme i vrati pravougaonik za obradu klika."""
        shape = pygame.Rect(rect)
        color = ACCENT if primary else PANEL
        if shape.collidepoint(mouse):
            color = (165, 227, 255) if primary else (48, 59, 79)
        pygame.draw.rect(self.screen, color, shape, border_radius=10)
        self.text(label, shape.center, BG if primary else TEXT, self.small, True)
        return shape

    def bounds(self):
        """Izračunaj unutrašnji pravougaonik bilijarskog stola."""
        width, height = self.screen.get_size()
        mx, my = max(80, width // 12), max(175, height // 5)
        return mx, my, width - mx, height - my

    def pockets(self):
        """Vrati šest džepova na uglovima i sredinama stranica stola."""
        left, top, right, bottom = self.bounds()
        middle = (left + right) / 2
        return [(left, top), (middle, top), (right, top),
                (left, bottom), (middle, bottom), (right, bottom)]

    def reset_rack(self):
        """Postavi belu kuglu i trougao sa punim, šarenim i crnom kuglom."""
        left, top, right, bottom = self.bounds()
        self.cue = {"x": left + (right - left) * .27, "y": (top + bottom) / 2,
                    "vx": 0.0, "vy": 0.0, "spin": 0.0, "follow": 0.0,
                    "color": (248, 250, 252), "number": None}
        self.balls = []
        spacing = RADIUS * 2 + 1
        apex_x = left + (right - left) * .69
        center_y = (top + bottom) / 2
        rack = [[1], [9, 2], [3, 8, 10], [11, 4, 12, 5], [6, 13, 7, 14, 15]]
        for column, numbers in enumerate(rack):
            for row, number in enumerate(numbers):
                self.balls.append({
                    "x": apex_x + column * spacing,
                    "y": center_y + (row - column / 2) * spacing,
                    "vx": 0.0, "vy": 0.0,
                    "color": BALL_COLORS[number - 1], "number": number,
                    "group": "black" if number == 8 else ("solid" if number < 8 else "stripe"),
                })
        self.sunk = 0
        self.groups = [None, None]
        self.current_player = 0
        self.shot_sunk = []
        self.scratched = False
        self.ai_due = None
        self.winner = None
        self.black_sunk = False
        self.first_contact_group = None
        self.shot_legal_group = None
        self.potted_by_group = {"solid": [], "stripe": [], "black": []}
        self.cue_offset = (0.0, 0.0)
        self.cue_stick_pull = 0.0
        self.shot_stick_time = 0.0
        self.physics_accumulator = 0.0
        self.prediction_cache_key = None
        self.prediction_cache = None
        self.animating = False
        self.dragging = False
        self.message = f"Tvoj red, {self.player_name}. Povuci od bele kugle unazad da nanišaniš."

    def setup_screen(self, mouse):
        """Prikaži unos imena i izbor lokalne igre ili igre protiv računara."""
        self.screen.fill(BG)
        self.text("MINI GAMES BY DJORDAN", (100, 74), ACCENT, self.small)
        self.text("BILIJAR", (100, 116), TEXT, self.heading)
        self.text("Izaberi režim igre i imena igrača", (100, 184), MUTED)
        self.text("Igrač 1", (100, 244), MUTED, self.small)
        first_rect = pygame.Rect(100, 271, 450, 56)
        pygame.draw.rect(self.screen, (42, 54, 75) if self.active_input == 0 else PANEL, first_rect, border_radius=10)
        self.text(self.name_text or "Ime igrača 1", (118, 286), TEXT if self.name_text else MUTED, self.small)
        self.text("Igrač 2 / protivnik", (100, 347), MUTED, self.small)
        second_rect = pygame.Rect(100, 374, 450, 56)
        pygame.draw.rect(self.screen, (42, 54, 75) if self.active_input == 1 else PANEL, second_rect, border_radius=10)
        second_hint = self.second_name_text or ("Računar" if self.mode == "computer" else "Ime igrača 2")
        self.text(second_hint, (118, 389), TEXT if self.second_name_text or self.mode == "computer" else MUTED, self.small)
        mode_rects = []
        for index, (mode, label) in enumerate((("1v1", "Dva igrača"), ("computer", "Protiv računara"))):
            rect = pygame.Rect(100 + index * 240, 466, 220, 54)
            mode_rects.append(rect)
            selected = self.mode == mode
            color = ACCENT if selected else PANEL
            if rect.collidepoint(mouse) and not selected:
                color = (48, 59, 79)
            pygame.draw.rect(self.screen, color, rect, border_radius=10)
            self.text(label, rect.center, BG if selected else TEXT, self.small, True)
        self.text(self.message, (100, 548), ERROR, self.small)
        start = self.button((100, 600, 240, 58), "Započni partiju", mouse, True)
        self.text("Povuci mišem od bele kugle unazad da nanišaniš i izabereš jačinu.",
                  (100, 688), MUTED, self.small)
        return first_rect, second_rect, mode_rects, start

    def game_screen(self, mouse):
        """Prikaži sto, kugle, status i kontrole igre."""
        self.screen.fill(BG)
        left, top, right, bottom = self.bounds()
        self.text("BILIJAR", (32, 15), TEXT, self.heading)
        self.draw_player_card(0, pygame.Rect(32, 76, 310, 82))
        self.draw_player_card(1, pygame.Rect(self.screen.get_width() - 342, 76, 310, 82))
        self.text("VS", (self.screen.get_width() // 2, 116), MUTED, self.small, True)
        pygame.draw.rect(self.screen, (7, 9, 14), (left - 31, top - 28, right - left + 62, bottom - top + 62), border_radius=32)
        pygame.draw.rect(self.screen, (49, 29, 22), (left - 25, top - 25, right - left + 50, bottom - top + 50), border_radius=28)
        pygame.draw.rect(self.screen, (151, 103, 62), (left - 19, top - 19, right - left + 38, bottom - top + 38), border_radius=23)
        pygame.draw.rect(self.screen, RAIL, (left - 15, top - 15, right - left + 30, bottom - top + 30), border_radius=19)
        pygame.draw.rect(self.screen, (153, 106, 65), (left - 8, top - 8, right - left + 16, bottom - top + 16), border_radius=14)
        pygame.draw.rect(self.screen, FELT, (left, top, right - left, bottom - top), border_radius=9)
        # Subtilne linije daju filcu teksturu, a rombovi označavaju tačke na mantinelama.
        for y in range(int(top + 8), int(bottom - 8), 24):
            pygame.draw.line(self.screen, (25, 113, 79), (left + 8, y), (right - 8, y), 1)
        for fraction in (.25, .5, .75):
            marker_x = int(left + (right - left) * fraction)
            marker_y = int(top + (bottom - top) * fraction)
            for x, y in ((marker_x, top - 10), (marker_x, bottom + 10),
                         (left - 10, marker_y), (right + 10, marker_y)):
                pygame.draw.polygon(self.screen, (223, 190, 143),
                                    ((x, y - 4), (x + 4, y), (x, y + 4), (x - 4, y)))
        for x, y in self.pockets():
            pygame.draw.circle(self.screen, (80, 53, 35), (int(x), int(y)), POCKET_RADIUS + 5)
            pygame.draw.circle(self.screen, (5, 7, 11), (int(x), int(y)), POCKET_RADIUS)
        for ball in self.balls:
            self.draw_ball(ball)
        if self.cue:
            self.draw_ball(self.cue)
        if self.dragging and self.cue:
            self.draw_aim_guide(pygame.mouse.get_pos())
            self.draw_cue_stick(pygame.mouse.get_pos())
        elif self.animating and self.shot_stick_time > 0:
            self.draw_cue_stick()
        self.text(self.message, (36, self.screen.get_height() - 45), MUTED, self.small)
        self.text("Klik na rub bele kugle daje spin · povuci štap za jačinu",
                  (460, self.screen.get_height() - 45), ACCENT, self.small)
        new_game = self.button((self.screen.get_width() - 390, 24, 170, 44), "Nova partija", mouse)
        menu = self.button((self.screen.get_width() - 205, 24, 170, 44), "Izbor režima", mouse)
        return new_game, menu

    def draw_player_card(self, player_index, rect):
        """Prikaži igrača, grupu kugli, potez i pregled ubačenih kugli."""
        active = player_index == self.current_player
        pygame.draw.rect(self.screen, (39, 57, 65) if active else PANEL, rect, border_radius=12)
        if active:
            pygame.draw.rect(self.screen, ACCENT, rect, 2, border_radius=12)
        self.text(self.player_name_for(player_index), (rect.x + 13, rect.y + 8), TEXT, self.small)
        group = self.groups[player_index]
        label = "Pune" if group == "solid" else "Šarene" if group == "stripe" else "Grupa se određuje"
        self.text(("NA POTEZU · " if active else "") + label,
                  (rect.x + 13, rect.y + 34), ACCENT if active else MUTED, self.small)
        sunk = self.potted_by_group[group] if group else []
        self.text(f"Ubačene: {len(sunk)}", (rect.right - 112, rect.y + 34), MUTED, self.small)
        for index, ball in enumerate(sunk[:10]):
            x, y = rect.x + 19 + index * 24, rect.bottom - 14
            pygame.draw.circle(self.screen, ball["color"], (x, y), 8)
            if ball["group"] == "stripe":
                pygame.draw.line(self.screen, (255, 255, 255), (x - 7, y), (x + 7, y), 3)
            pygame.draw.circle(self.screen, TEXT, (x, y), 8, 1)

    def draw_ball(self, ball):
        """Nacrtaj kuglu, broj i šarenu traku za kugle iz grupe stripes."""
        x, y = round(ball["x"]), round(ball["y"])
        pygame.draw.circle(self.screen, (7, 9, 13), (x + 2, y + 3), RADIUS + 1)
        base_color = (248, 250, 252) if ball.get("group") == "stripe" else ball["color"]
        pygame.draw.circle(self.screen, base_color, (x, y), RADIUS)
        if ball.get("group") == "stripe":
            # Iscrtaj traku u opsegu kruga da ostane pravilno isečena po ivicama kugle.
            for offset_y in range(-5, 6):
                half_width = int(math.sqrt(max(0, RADIUS * RADIUS - offset_y * offset_y)))
                pygame.draw.line(self.screen, ball["color"], (x - half_width, y + offset_y),
                                 (x + half_width, y + offset_y), 1)
            pygame.draw.circle(self.screen, (220, 225, 233), (x, y), RADIUS, 1)
        pygame.draw.circle(self.screen, (255, 255, 255), (x - 4, y - 5), 3)
        if ball["number"] is not None:
            pygame.draw.circle(self.screen, (248, 250, 252), (x, y), 5)
            self.text(str(ball["number"]), (x, y), (15, 19, 29), self.small, True)

    def dashed_line(self, start, end, color, dash=9, gap=7, width=2):
        """Crta isprekidanu liniju između dve tačke."""
        dx, dy = end[0] - start[0], end[1] - start[1]
        length = math.hypot(dx, dy)
        if not length:
            return
        ux, uy = dx / length, dy / length
        position = 0
        while position < length:
            finish = min(length, position + dash)
            pygame.draw.line(self.screen, color,
                             (round(start[0] + ux * position), round(start[1] + uy * position)),
                             (round(start[0] + ux * finish), round(start[1] + uy * finish)), width)
            position += dash + gap

    def draw_aim_guide(self, mouse_position):
        """Prikaži očekivanu putanju bele kugle, ciljane kugle i rupe."""
        dx = self.cue["x"] - mouse_position[0]
        dy = self.cue["y"] - mouse_position[1]
        distance = math.hypot(dx, dy)
        if distance < 1:
            return
        ux, uy = dx / distance, dy / distance
        pull_ratio = min(distance, 180.0) / 180.0
        speed = MIN_POWER + (MAX_POWER - MIN_POWER) * pull_ratio ** 1.25
        target, target_distance = None, float("inf")
        for ball in self.aimable_balls():
            rel_x, rel_y = ball["x"] - self.cue["x"], ball["y"] - self.cue["y"]
            projection = rel_x * ux + rel_y * uy
            offset = abs(rel_x * uy - rel_y * ux)
            if 0 < projection < target_distance and offset < RADIUS * 2:
                target, target_distance = ball, projection
        if target:
            normal_x = target["x"] - self.cue["x"]
            normal_y = target["y"] - self.cue["y"]
            normal_length = math.hypot(normal_x, normal_y) or 1.0
            normal_x, normal_y = normal_x / normal_length, normal_y / normal_length
            impact = (target["x"] - normal_x * RADIUS,
                      target["y"] - normal_y * RADIUS)
            self.dashed_line((self.cue["x"], self.cue["y"]), impact, (245, 248, 255), width=3)
            offset_x, offset_y = self.cue_offset
            side_hit = offset_x * -uy + offset_y * ux
            spin = max(-18.0, min(18.0, side_hit * 18.0))
            target_path, endpoint, pocketed = self.predict_aimed_ball(ux, uy, speed, spin)
            if target_path:
                points = [(round(point[0]), round(point[1])) for point in target_path]
                if len(points) > 1:
                    pygame.draw.lines(self.screen, (255, 210, 105), False, points, 3)
                pygame.draw.circle(self.screen, (255, 210, 105),
                                   (round(endpoint[0]), round(endpoint[1])), 8, 2)
                if pocketed:
                    pygame.draw.circle(self.screen, SUCCESS,
                                       (round(endpoint[0]), round(endpoint[1])), 5)
        else:
            self.dashed_line((self.cue["x"], self.cue["y"]),
                             (self.cue["x"] + ux * 380, self.cue["y"] + uy * 380),
                             (245, 248, 255), width=3)

        self.cue_stick_pull = pull_ratio * 150.0
        self.draw_power_meter(pull_ratio)

    def predict_aimed_ball(self, ux, uy, speed, spin):
        """Simulate the aimed shot and return the first hit ball's route and endpoint."""
        key = (round(ux, 2), round(uy, 2), round(speed / 50), round(spin),
               round(self.cue["x"], 1), round(self.cue["y"], 1),
               tuple((ball["number"], round(ball["x"], 1), round(ball["y"], 1))
                     for ball in self.balls))
        if key == self.prediction_cache_key:
            return self.prediction_cache

        simulated = [{"x": ball["x"], "y": ball["y"], "vx": 0.0, "vy": 0.0,
                      "spin": 0.0, "number": ball["number"], "cue": False}
                     for ball in self.balls]
        cue = {"x": self.cue["x"], "y": self.cue["y"],
               "vx": ux * speed, "vy": uy * speed, "spin": spin,
               "number": None, "cue": True}
        simulated.append(cue)
        first_hit = None
        path = []
        endpoint = None
        pocketed = False
        left, top, right, bottom = self.bounds()
        pockets = self.pockets()
        dt = 1.0 / 120.0

        for step in range(480):
            for index, first in enumerate(simulated):
                for second in simulated[index + 1:]:
                    dx, dy = second["x"] - first["x"], second["y"] - first["y"]
                    distance = math.hypot(dx, dy)
                    if distance == 0 or distance >= RADIUS * 2:
                        continue
                    nx, ny = dx / distance, dy / distance
                    overlap = RADIUS * 2 - distance
                    first["x"] -= nx * overlap / 2
                    first["y"] -= ny * overlap / 2
                    second["x"] += nx * overlap / 2
                    second["y"] += ny * overlap / 2
                    relative = (first["vx"] - second["vx"]) * nx + (first["vy"] - second["vy"]) * ny
                    if relative > 0:
                        if first_hit is None and (first["cue"] or second["cue"]):
                            first_hit = second if first["cue"] else first
                            path.append((first_hit["x"], first_hit["y"]))
                        impulse = (1.0 + BALL_RESTITUTION) * relative / 2
                        first["vx"] -= impulse * nx
                        first["vy"] -= impulse * ny
                        second["vx"] += impulse * nx
                        second["vy"] += impulse * ny

            for ball in simulated:
                spin = ball["spin"]
                if abs(spin) > .01:
                    curve = spin * min(math.hypot(ball["vx"], ball["vy"]), 700.0) * .00006
                    ball["vx"] += -ball["vy"] * curve * dt
                    ball["vy"] += ball["vx"] * curve * dt
                ball["x"] += ball["vx"] * dt
                ball["y"] += ball["vy"] * dt
                drag = math.exp(-ROLLING_DRAG * dt)
                ball["vx"] *= drag
                ball["vy"] *= drag
                ball["spin"] *= math.exp(-2.8 * dt)

            if first_hit is not None and step % 2 == 0:
                path.append((first_hit["x"], first_hit["y"]))

            remaining = []
            for ball in simulated:
                if not ball["cue"]:
                    pocket = next((point for point in pockets
                                   if math.hypot(ball["x"] - point[0], ball["y"] - point[1])
                                   < POCKET_RADIUS - 3), None)
                    if pocket:
                        if ball is first_hit:
                            endpoint, pocketed = pocket, True
                        continue
                if ball["x"] - RADIUS < left:
                    ball["vx"] = abs(ball["vx"]) * RAIL_RESTITUTION
                    ball["x"] = left + RADIUS
                elif ball["x"] + RADIUS > right:
                    ball["vx"] = -abs(ball["vx"]) * RAIL_RESTITUTION
                    ball["x"] = right - RADIUS
                if ball["y"] - RADIUS < top:
                    ball["vy"] = abs(ball["vy"]) * RAIL_RESTITUTION
                    ball["y"] = top + RADIUS
                elif ball["y"] + RADIUS > bottom:
                    ball["vy"] = -abs(ball["vy"]) * RAIL_RESTITUTION
                    ball["y"] = bottom - RADIUS
                remaining.append(ball)
            simulated = remaining
            if first_hit is not None and first_hit not in simulated:
                break
            if not any(math.hypot(ball["vx"], ball["vy"]) > STOP_SPEED for ball in simulated):
                break

        if first_hit is not None and endpoint is None:
            endpoint = (first_hit["x"], first_hit["y"])
            if not path or math.dist(path[-1], endpoint) > 2:
                path.append(endpoint)
        result = (path, endpoint, pocketed) if first_hit is not None else ([], None, False)
        self.prediction_cache_key, self.prediction_cache = key, result
        return result

    def draw_power_meter(self, power_ratio):
        """Prikaži jačinu udarca koja raste kako igrač povlači štap."""
        width, height = 250, 14
        x, y = (self.screen.get_width() - width) // 2, self.screen.get_height() - 82
        self.text("SNAGA UDARCA", (x, y - 25), MUTED, self.small)
        pygame.draw.rect(self.screen, PANEL, (x, y, width, height), border_radius=7)
        fill_width = round(width * power_ratio)
        if fill_width:
            color = (74, 222, 128) if power_ratio < .45 else ACCENT
            if power_ratio > .8:
                color = (251, 191, 36)
            pygame.draw.rect(self.screen, color, (x, y, fill_width, height), border_radius=7)
        self.text(f"{round(power_ratio * 100)}%", (x + width + 10, y - 5), TEXT, self.small)

    def ray_to_rail(self, x, y, dx, dy):
        """Find the first inner table edge intersected by a projected ball path."""
        left, top, right, bottom = self.bounds()
        times = []
        if dx > 1e-6:
            times.append((right - RADIUS - x) / dx)
        elif dx < -1e-6:
            times.append((left + RADIUS - x) / dx)
        if dy > 1e-6:
            times.append((bottom - RADIUS - y) / dy)
        elif dy < -1e-6:
            times.append((top + RADIUS - y) / dy)
        distance = min((value for value in times if value > 0), default=0)
        return x + dx * distance, y + dy * distance

    def draw_cue_stick(self, mouse_position=None):
        """Draw the cue behind the ball and show the selected off-center hit."""
        if mouse_position is not None:
            dx, dy = self.cue["x"] - mouse_position[0], self.cue["y"] - mouse_position[1]
            length = math.hypot(dx, dy) or 1
            ux, uy = dx / length, dy / length
            pull = self.cue_stick_pull
        else:
            ux, uy = -self.stick_direction[0], -self.stick_direction[1]
            pull = self.shot_stick_time * 700
        near = RADIUS + 7 + pull
        far = near + 220
        start = (self.cue["x"] - ux * near, self.cue["y"] - uy * near)
        end = (self.cue["x"] - ux * far, self.cue["y"] - uy * far)
        start = (round(start[0]), round(start[1]))
        end = (round(end[0]), round(end[1]))
        pygame.draw.line(self.screen, (69, 43, 31), start, end, 10)
        pygame.draw.line(self.screen, (222, 190, 145), start, end, 5)
        ox, oy = self.cue_offset
        if math.hypot(ox, oy) > .08:
            marker = (self.cue["x"] + ox * RADIUS * .65,
                      self.cue["y"] + oy * RADIUS * .65)
            pygame.draw.circle(self.screen, ACCENT, (round(marker[0]), round(marker[1])), 3)

    def shoot(self, mouse_position):
        """Izračunaj smer i jačinu udarca na osnovu povlačenja miša."""
        dx, dy = self.cue["x"] - mouse_position[0], self.cue["y"] - mouse_position[1]
        distance = math.hypot(dx, dy)
        if distance < 5:
            return
        power_ratio = min(distance, 180.0) / 180.0
        # Jaka povlačenja daju nesrazmerno snažniji udarac, kao kod zamaha štapom.
        speed = MIN_POWER + (MAX_POWER - MIN_POWER) * power_ratio ** 1.25
        offset_x, offset_y = self.cue_offset
        side_hit = offset_x * (-dy / distance) + offset_y * (dx / distance)
        follow_hit = offset_x * (dx / distance) + offset_y * (dy / distance)
        self.cue["spin"] = max(-18.0, min(18.0, side_hit * 18.0))
        self.cue["follow"] = max(-12.0, min(12.0, follow_hit * 12.0))
        self.cue["vx"] = dx / distance * speed
        self.cue["vy"] = dy / distance * speed
        self.stick_direction = (dx / distance, dy / distance)
        self.shot_stick_time = .10
        self.animating = True
        self.shot_sunk = []
        self.black_sunk = False
        self.scratched = False
        self.first_contact_group = None
        self.shot_legal_group = self.legal_group(self.current_player)
        self.ai_due = None
        self.message = "Udarac!"

    def moving_balls(self):
        """Proveri da li se neka kugla kreće brže od praga zaustavljanja."""
        return any(math.hypot(ball["vx"], ball["vy"]) > STOP_SPEED
                   for ball in self.balls + ([self.cue] if self.cue else []))

    def physics_step(self, dt):
        """Simuliraj fiksni vremenski korak uz trenje, rotaciju i sudare."""
        self.collide_balls()
        for ball in self.balls + [self.cue]:
            spin = ball.get("spin", 0.0)
            speed = math.hypot(ball["vx"], ball["vy"])
            if speed > 0 and abs(spin) > .01:
                curve = spin * min(speed, 700.0) * .00006
                ball["vx"] += -ball["vy"] * curve * dt
                ball["vy"] += ball["vx"] * curve * dt
            ball["x"] += ball["vx"] * dt
            ball["y"] += ball["vy"] * dt
            drag = math.exp(-ROLLING_DRAG * dt)
            ball["vx"] *= drag
            ball["vy"] *= drag
            ball["spin"] = spin * math.exp(-2.8 * dt)
            ball["follow"] = ball.get("follow", 0.0) * math.exp(-3.2 * dt)
            if math.hypot(ball["vx"], ball["vy"]) < STOP_SPEED:
                ball["vx"] = ball["vy"] = 0.0
                ball["spin"] *= .6
        self.pocket_balls()
        self.bounce_rails()
        if not self.moving_balls():
            self.animating = False
            self.resolve_shot()

    def player_name_for(self, player_index):
        """Vrati ime aktivnog igrača ili računara."""
        return self.player_name if player_index == 0 else self.second_player

    def resolve_shot(self):
        """Dodeli grupe kugli, odredi da li igrač zadržava potez i proveri osmicu."""
        self.message = ""
        pocketed_groups = [ball["group"] for ball in self.shot_sunk]
        legal_group = self.shot_legal_group
        foul = self.scratched or self.first_contact_group is None or (
            legal_group is not None and self.first_contact_group != legal_group)
        for ball in self.shot_sunk:
            self.potted_by_group[ball["group"]].append(ball)
        if self.black_sunk:
            own_group = self.groups[self.current_player]
            own_left = any(ball["group"] == own_group for ball in self.balls) if own_group else True
            if own_group and not own_left and not foul:
                self.winner = self.current_player
            else:
                self.winner = 1 - self.current_player
            self.state = "result"
            self.message = f"{self.player_name_for(self.winner)} je pobedio!"
            return

        if self.groups[self.current_player] is None and not foul:
            first_group = next((group for group in pocketed_groups if group in ("solid", "stripe")), None)
            if first_group:
                self.groups[self.current_player] = first_group
                self.groups[1 - self.current_player] = "stripe" if first_group == "solid" else "solid"
                self.message = f"{self.player_name_for(self.current_player)} dobija {'pune' if first_group == 'solid' else 'šarene'} kugle."

        own_group = self.groups[self.current_player]
        kept_turn = not foul and own_group is not None and own_group in pocketed_groups
        if not kept_turn:
            self.current_player = 1 - self.current_player
        if foul:
            self.message = "Faul: pogodi svoju grupu prvom kuglom i izbegni belu kuglu. Menja se potez."
        elif not kept_turn and not self.message:
            self.message = "Nije ubačena kugla tvoje grupe. Menja se potez."
        elif kept_turn and not self.message:
            self.message = f"Ubačena je kugla tvoje grupe. Igra {self.player_name_for(self.current_player)} ponovo."
        else:
            self.message += f" Na potezu: {self.player_name_for(self.current_player)}."
        if self.mode == "computer" and self.current_player == 1:
            self.ai_due = pygame.time.get_ticks() + 650

    def computer_shot(self):
        """Izaberi pogodnu kuglu i udari je približno u pravcu najbližeg džepa."""
        self.cue_offset = (0.0, 0.0)
        targets = self.aimable_balls()
        if not targets:
            self.current_player = 0
            return

        options = []
        for ball in targets:
            for pocket in self.pockets():
                dx, dy = pocket[0] - ball["x"], pocket[1] - ball["y"]
                length = math.hypot(dx, dy) or 1
                ux, uy = dx / length, dy / length
                contact = (ball["x"] - ux * RADIUS * 2,
                           ball["y"] - uy * RADIUS * 2)
                cue_distance = math.hypot(contact[0] - self.cue["x"],
                                          contact[1] - self.cue["y"])
                options.append((cue_distance + length * .35, ball, contact))
        _, _target, contact = min(options, key=lambda option: option[0])
        dx, dy = contact[0] - self.cue["x"], contact[1] - self.cue["y"]
        length = math.hypot(dx, dy) or 1
        # Shoot expects a mouse point pulled opposite to the intended direction.
        fake_mouse = (self.cue["x"] - dx / length * 90,
                      self.cue["y"] - dy / length * 90)
        self.shoot(fake_mouse)
        self.message = "Računar cilja..."

    def result_screen(self, mouse):
        """Prikaži pobednika i dugmad za novu partiju ili izbor režima."""
        self.game_screen(mouse)
        overlay = pygame.Surface(self.screen.get_size(), pygame.SRCALPHA)
        overlay.fill((6, 8, 13, 205))
        self.screen.blit(overlay, (0, 0))
        self.text("KRAJ PARTIJE", (self.screen.get_width() // 2, self.screen.get_height() // 2 - 85),
                  ACCENT, self.small, True)
        self.text(self.message, (self.screen.get_width() // 2, self.screen.get_height() // 2 - 35),
                  SUCCESS if self.winner == 0 else ERROR, self.heading, True)
        replay = self.button((self.screen.get_width() // 2 - 225,
                              self.screen.get_height() // 2 + 35, 205, 55),
                             "Igraj ponovo", mouse, True)
        menu = self.button((self.screen.get_width() // 2 + 20,
                            self.screen.get_height() // 2 + 35, 205, 55),
                           "Izbor režima", mouse)
        return replay, menu

    def collide_balls(self):
        """Izračunaj jednostavne elastične sudare kugli jednake mase."""
        all_balls = self.balls + [self.cue]
        diameter = RADIUS * 2
        for index, first in enumerate(all_balls):
            for second in all_balls[index + 1:]:
                dx, dy = second["x"] - first["x"], second["y"] - first["y"]
                distance = math.hypot(dx, dy)
                if distance == 0 or distance >= diameter:
                    continue
                nx, ny = dx / distance, dy / distance
                overlap = diameter - distance
                first["x"] -= nx * overlap / 2
                first["y"] -= ny * overlap / 2
                second["x"] += nx * overlap / 2
                second["y"] += ny * overlap / 2
                relative = (first["vx"] - second["vx"]) * nx + (first["vy"] - second["vy"]) * ny
                if relative > 0:
                    if self.animating and self.first_contact_group is None and (first is self.cue or second is self.cue):
                        other = second if first is self.cue else first
                        self.first_contact_group = other["group"]
                    impulse = (1.0 + BALL_RESTITUTION) * relative / 2
                    first["vx"] -= impulse * nx
                    first["vy"] -= impulse * ny
                    second["vx"] += impulse * nx
                    second["vy"] += impulse * ny
                    tangent_x, tangent_y = -ny, nx
                    tangent_speed = (second["vx"] - first["vx"]) * tangent_x + (second["vy"] - first["vy"]) * tangent_y
                    spin_effect = (first.get("spin", 0.0) + second.get("spin", 0.0)) * RADIUS * .08
                    tangent_impulse = max(-impulse * .08, min(impulse * .08,
                                                               -(tangent_speed + spin_effect) * .08))
                    first["vx"] -= tangent_impulse * tangent_x
                    first["vy"] -= tangent_impulse * tangent_y
                    second["vx"] += tangent_impulse * tangent_x
                    second["vy"] += tangent_impulse * tangent_y
                    first["spin"] = first.get("spin", 0.0) - tangent_impulse * .25
                    second["spin"] = second.get("spin", 0.0) - tangent_impulse * .25
                    cue_ball = first if first is self.cue else second if second is self.cue else None
                    if cue_ball is not None and cue_ball.get("follow", 0.0):
                        direction = 1.0 if cue_ball is first else -1.0
                        cue_ball["vx"] += nx * direction * cue_ball["follow"] * 10
                        cue_ball["vy"] += ny * direction * cue_ball["follow"] * 10
                        cue_ball["follow"] *= .35

    def legal_group(self, player_index):
        """Vrati dozvoljenu grupu za potez; osmica sledi nakon čišćenja grupe."""
        group = self.groups[player_index]
        if group:
            return group if any(ball["group"] == group for ball in self.balls) else "black"
        if any(ball["group"] != "black" for ball in self.balls):
            return None
        return "black"

    def aimable_balls(self):
        """Vrati samo kugle koje igrač sme da gađa u ovom potezu."""
        group = self.legal_group(self.current_player)
        return [ball for ball in self.balls
                if (ball["group"] != "black" if group is None else ball["group"] == group)]

    def pocket_balls(self):
        """Ukloni kugle kod džepova i vrati belu kuglu na sto ako upadne."""
        pockets = self.pockets()
        in_pocket = lambda ball: any(math.hypot(ball["x"] - x, ball["y"] - y) < POCKET_RADIUS - 3
                                      for x, y in pockets)
        remaining = []
        for ball in self.balls:
            if in_pocket(ball):
                self.sunk += 1
                self.shot_sunk.append(ball)
                if ball["group"] == "black":
                    self.black_sunk = True
            else:
                remaining.append(ball)
        self.balls = remaining
        if in_pocket(self.cue):
            self.scratched = True
            left, top, right, bottom = self.bounds()
            self.cue.update(x=left + (right - left) * .27, y=(top + bottom) / 2,
                            vx=0.0, vy=0.0, spin=0.0, follow=0.0)
            self.message = "Bela kugla je upala i vraćena je na početnu poziciju."

    def bounce_rails(self):
        """Odbij kugle od ivica stola, ostavljajući otvor džepova slobodnim."""
        left, top, right, bottom = self.bounds()
        for ball in self.balls + [self.cue]:
            if ball["x"] - RADIUS < left:
                ball["vx"] = abs(ball["vx"]) * RAIL_RESTITUTION
                ball["x"] = left + RADIUS
                ball["vy"] += ball.get("spin", 0.0) * 2.0
                ball["spin"] *= .72
            elif ball["x"] + RADIUS > right:
                ball["vx"] = -abs(ball["vx"]) * RAIL_RESTITUTION
                ball["x"] = right - RADIUS
                ball["vy"] -= ball.get("spin", 0.0) * 2.0
                ball["spin"] *= .72
            if ball["y"] - RADIUS < top:
                ball["vy"] = abs(ball["vy"]) * RAIL_RESTITUTION
                ball["y"] = top + RADIUS
                ball["vx"] -= ball.get("spin", 0.0) * 2.0
                ball["spin"] *= .72
            elif ball["y"] + RADIUS > bottom:
                ball["vy"] = -abs(ball["vy"]) * RAIL_RESTITUTION
                ball["y"] = bottom - RADIUS
                ball["vx"] += ball.get("spin", 0.0) * 2.0
                ball["spin"] *= .72

    def run(self):
        """Obrađuj Pygame događaje i održavaj animaciju u 60 FPS."""
        running = True
        while running:
            mouse = pygame.mouse.get_pos()
            if self.state == "setup":
                controls = self.setup_screen(mouse)
            elif self.state == "result":
                controls = self.result_screen(mouse)
            else:
                controls = self.game_screen(mouse)
            exit_rect = self.button((self.screen.get_width() - 170,
                                     self.screen.get_height() - 62, 145, 42),
                                    "Izlaz", mouse)
            dt = self.clock.tick(60)
            if self.animating:
                self.physics_accumulator += min(dt / 1000.0, 0.05)
                self.shot_stick_time = max(0.0, self.shot_stick_time - dt / 1000.0)
                fixed_step = 1.0 / 240.0
                while self.physics_accumulator >= fixed_step and self.animating:
                    self.physics_step(fixed_step)
                    self.physics_accumulator -= fixed_step
                    if not self.animating:
                        break
            if (self.state == "playing" and not self.animating and self.ai_due is not None
                    and pygame.time.get_ticks() >= self.ai_due):
                self.ai_due = None
                self.computer_shot()
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False
                    elif self.state == "setup":
                        if event.key == pygame.K_BACKSPACE:
                            if self.active_input == 0:
                                self.name_text = self.name_text[:-1]
                            else:
                                self.second_name_text = self.second_name_text[:-1]
                        elif event.key == pygame.K_TAB:
                            self.active_input = 1 - self.active_input
                        elif event.key == pygame.K_RETURN:
                            self.begin_game()
                        elif event.unicode and event.unicode.isprintable():
                            if self.active_input == 0:
                                self.name_text += event.unicode
                            else:
                                self.second_name_text += event.unicode
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if exit_rect.collidepoint(event.pos):
                        running = False
                    elif self.state == "setup":
                        first_rect, second_rect, mode_rects, start_rect = controls
                        if first_rect.collidepoint(event.pos):
                            self.active_input = 0
                        elif second_rect.collidepoint(event.pos):
                            self.active_input = 1
                        for mode, rect in zip(("1v1", "computer"), mode_rects):
                            if rect.collidepoint(event.pos):
                                self.mode = mode
                        if start_rect.collidepoint(event.pos):
                            self.begin_game()
                    elif self.state == "result":
                        replay_rect, menu_rect = controls
                        if replay_rect.collidepoint(event.pos):
                            self.state = "playing"
                            self.reset_rack()
                        elif menu_rect.collidepoint(event.pos):
                            self.state = "setup"
                    elif not self.animating and not (self.mode == "computer" and self.current_player == 1):
                        new_game_rect, menu_rect = controls
                        if new_game_rect.collidepoint(event.pos):
                            self.reset_rack()
                        elif menu_rect.collidepoint(event.pos):
                            self.state = "setup"
                        elif math.hypot(event.pos[0] - self.cue["x"], event.pos[1] - self.cue["y"]) <= RADIUS * 2.5:
                            offset_x = (event.pos[0] - self.cue["x"]) / RADIUS
                            offset_y = (event.pos[1] - self.cue["y"]) / RADIUS
                            offset_length = math.hypot(offset_x, offset_y) or 1.0
                            scale = min(0.8, 0.8 / offset_length)
                            self.cue_offset = (offset_x * scale, offset_y * scale)
                            self.dragging = True
                elif event.type == pygame.MOUSEBUTTONUP and event.button == 1 and self.state == "playing":
                    if self.dragging and not self.animating:
                        self.shoot(event.pos)
                    self.dragging = False
            pygame.display.flip()
        pygame.quit()
        sys.exit()

    def begin_game(self):
        """Proveri imena i pokreni izabrani lokalni ili računarski režim."""
        self.player_name = self.name_text.strip() or "Igrač"
        if self.mode == "1v1":
            self.second_player = self.second_name_text.strip()
            if not self.second_player:
                self.message = "Unesi ime drugog igrača."
                return
        else:
            self.second_player = "Računar"
        self.state = "playing"
        self.reset_rack()


def main():
    """Pokreni Pygame bilijar."""
    BilliardsGame().run()


if __name__ == "__main__":
    main()
