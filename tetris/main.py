"""Pygame desktop Tetris za jednog igrača."""

import random
import sys
import pygame


BG = (16, 19, 29)
PANEL = (23, 28, 41)
GRID = (48, 57, 79)
TEXT = (244, 246, 255)
MUTED = (174, 184, 208)
ACCENT = (125, 211, 252)
ERROR = (251, 113, 133)
SUCCESS = (74, 222, 128)
CELL = 30
COLS = 10
ROWS = 20
TARGET_SCORE = 5000
LINE_POINTS = [0, 100, 300, 500, 800]
LEVEL_DELAYS = [650, 520, 410, 310, 220]
SHAPES = {
    "I": [(1, 0), (1, 1), (1, 2), (1, 3)],
    "O": [(0, 1), (0, 2), (1, 1), (1, 2)],
    "T": [(0, 1), (1, 0), (1, 1), (1, 2)],
    "S": [(0, 1), (0, 2), (1, 0), (1, 1)],
    "Z": [(0, 0), (0, 1), (1, 1), (1, 2)],
    "J": [(0, 0), (1, 0), (1, 1), (1, 2)],
    "L": [(0, 2), (1, 0), (1, 1), (1, 2)],
}
COLORS = {
    "I": (56, 189, 248), "O": (250, 204, 21), "T": (192, 132, 252),
    "S": (74, 222, 128), "Z": (251, 113, 133), "J": (96, 165, 250),
    "L": (251, 146, 60),
}


class TetrisGame:
    """Čuva mrežu, figure, nivo i rezultat, i crta Pygame prikaz igre."""

    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Tetris | Mini Games by Djordan")
        self.screen = pygame.display.set_mode((1180, 820), pygame.FULLSCREEN)
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("segoeui", 22)
        self.small = pygame.font.SysFont("segoeui", 17)
        self.heading = pygame.font.SysFont("segoeui", 42, bold=True)
        self.state = "setup"
        self.name_text = ""
        self.player_name = ""
        self.chosen_level = 1
        self.start_level = 1
        self.message = ""

    def draw_text(self, value, x, y, color=TEXT, font=None, center=False):
        """Nacrtaj tekst na ekranu igre."""
        image = (font or self.font).render(value, True, color)
        rect = image.get_rect(center=(x, y)) if center else image.get_rect(topleft=(x, y))
        self.screen.blit(image, rect)

    def button(self, rect, label, mouse, primary=True):
        """Nacrtaj dugme sa stanjem hover i vrati njegov pravougaonik."""
        shape = pygame.Rect(rect)
        color = ACCENT if primary else PANEL
        if shape.collidepoint(mouse):
            color = (165, 227, 255) if primary else (48, 59, 79)
        pygame.draw.rect(self.screen, color, shape, border_radius=10)
        self.draw_text(label, *shape.center, BG if primary else TEXT, self.small, center=True)
        return shape

    def setup_screen(self, mouse):
        """Prikaži unos imena i izbor jednog od pet početnih nivoa."""
        self.screen.fill(BG)
        self.draw_text("MINI GAMES BY DJORDAN", 100, 75, ACCENT, self.small)
        self.draw_text("TETRIS", 100, 115, TEXT, self.heading)
        self.draw_text("Unesi ime igrača", 110, 225, MUTED, self.small)
        name_rect = pygame.Rect(110, 255, 560, 56)
        pygame.draw.rect(self.screen, PANEL, name_rect, border_radius=9)
        self.draw_text(self.name_text or "Ime igrača...", 126, 269,
                       TEXT if self.name_text else MUTED, self.small)
        self.draw_text("Početni nivo (pobeda na 5000 poena)", 110, 345, MUTED, self.small)
        levels = []
        for level in range(1, 6):
            rect = pygame.Rect(110 + (level - 1) * 118, 380, 104, 52)
            levels.append(rect)
            color = ACCENT if level == self.chosen_level else PANEL
            if rect.collidepoint(mouse) and level != self.chosen_level:
                color = (48, 59, 79)
            pygame.draw.rect(self.screen, color, rect, border_radius=9)
            label_color = BG if level == self.chosen_level else TEXT
            self.draw_text(f"Nivo {level}", *rect.center, label_color, self.small, center=True)
        self.draw_text("Svaki naredni nivo ubrzava padanje. Svakih 1000 poena prelaziš nivo.",
                       110, 465, MUTED, self.small)
        if self.message:
            self.draw_text(self.message, 110, 525, ERROR, self.small)
        start_rect = self.button((110, 570, 220, 56), "Započni igru", mouse)
        return name_rect, levels, start_rect

    def begin_game(self):
        """Proveri ime i pokreni novu tablu na izabranom nivou."""
        self.player_name = self.name_text.strip()
        if not self.player_name:
            self.message = "Unesi ime igrača pre početka."
            return
        self.start_level = self.chosen_level
        self.state = "playing"
        self.new_game()

    def new_game(self):
        """Resetuj tablu i skor, zadržavajući ime i izabrani nivo."""
        self.board = [[None for _ in range(COLS)] for _ in range(ROWS)]
        self.score = 0
        self.lines = 0
        self.level = self.start_level
        self.game_over = False
        self.soft_drop = False
        self.next_kind = self.random_kind()
        self.spawn_piece()
        self.next_fall = pygame.time.get_ticks() + LEVEL_DELAYS[self.level - 1]

    @staticmethod
    def random_kind():
        """Izaberi nasumičan oblik tetromina."""
        return random.choice(tuple(SHAPES))

    def spawn_piece(self):
        """Postavi sledeću figuru na vrh table i proveri sudar."""
        kind = self.next_kind
        self.next_kind = self.random_kind()
        self.current = {"kind": kind, "cells": list(SHAPES[kind]), "row": 0, "column": 3}
        if not self.fits(self.current["row"], self.current["column"], self.current["cells"]):
            self.finish(False)

    def fits(self, row, column, cells):
        """Proveri granice i sudare za predloženu poziciju figure."""
        for cell_row, cell_column in cells:
            board_row = row + cell_row
            board_column = column + cell_column
            if board_column < 0 or board_column >= COLS or board_row >= ROWS:
                return False
            if board_row >= 0 and self.board[board_row][board_column] is not None:
                return False
        return True

    def move(self, dr, dc):
        """Pomeri aktivnu figuru ako odredišna polja nisu zauzeta."""
        if self.game_over:
            return False
        row, column = self.current["row"] + dr, self.current["column"] + dc
        if not self.fits(row, column, self.current["cells"]):
            return False
        self.current["row"], self.current["column"] = row, column
        return True

    def rotate(self):
        """Rotiraj trenutnu figuru za 90 stepeni u smeru kazaljke na satu."""
        if self.game_over:
            return
        turned = [(column, 3 - row) for row, column in self.current["cells"]]
        min_row = min(row for row, _ in turned)
        min_column = min(column for _, column in turned)
        turned = [(row - min_row, column - min_column) for row, column in turned]
        if self.fits(self.current["row"], self.current["column"], turned):
            self.current["cells"] = turned

    def lock_piece(self):
        """Zaključaj figuru, ukloni pune redove, dodeli bodove i proveri pobedu."""
        for cell_row, cell_column in self.current["cells"]:
            row, column = self.current["row"] + cell_row, self.current["column"] + cell_column
            if row < 0:
                return self.finish(False)
            self.board[row][column] = COLORS[self.current["kind"]]
        remaining = [row for row in self.board if not all(cell is not None for cell in row)]
        cleared = ROWS - len(remaining)
        if cleared:
            self.board = [[None for _ in range(COLS)] for _ in range(cleared)] + remaining
            self.score += LINE_POINTS[cleared] * self.level
            self.lines += cleared
            self.level = max(self.start_level, min(5, self.score // 1000 + 1))
        if self.score >= TARGET_SCORE:
            return self.finish(True)
        self.spawn_piece()

    def finish(self, won):
        """Zaustavi igru i zapamti da li je igrač pobedio ili izgubio."""
        self.game_over = True
        self.state = "result"
        self.won = won

    def draw_cell(self, x, y, color):
        """Nacrtaj jedno obojeno polje tetromina."""
        rect = pygame.Rect(x, y, CELL, CELL)
        pygame.draw.rect(self.screen, color, rect.inflate(-2, -2), border_radius=4)
        pygame.draw.rect(self.screen, GRID, rect, 1, border_radius=4)

    def game_screen(self, mouse):
        """Nacrtaj tablu, sledeću figuru, rezultat i kontrole."""
        self.screen.fill(BG)
        board_x = max(80, self.screen.get_width() // 2 - 340)
        board_y = max(44, (self.screen.get_height() - ROWS * CELL) // 2)
        self.draw_text("TETRIS", board_x, 20, TEXT, self.heading)
        self.draw_text(f"Igrač: {self.player_name}", board_x, 70, MUTED, self.small)
        pygame.draw.rect(self.screen, PANEL, (board_x - 5, board_y - 5, COLS * CELL + 10, ROWS * CELL + 10), border_radius=8)
        pygame.draw.rect(self.screen, (11, 14, 22), (board_x, board_y, COLS * CELL, ROWS * CELL))
        for row, values in enumerate(self.board):
            for column, color in enumerate(values):
                if color:
                    self.draw_cell(board_x + column * CELL, board_y + row * CELL, color)
        for row in range(ROWS + 1):
            pygame.draw.line(self.screen, GRID, (board_x, board_y + row * CELL), (board_x + COLS * CELL, board_y + row * CELL))
        for column in range(COLS + 1):
            pygame.draw.line(self.screen, GRID, (board_x + column * CELL, board_y), (board_x + column * CELL, board_y + ROWS * CELL))
        for row, column in self.current["cells"]:
            self.draw_cell(board_x + (self.current["column"] + column) * CELL,
                           board_y + (self.current["row"] + row) * CELL,
                           COLORS[self.current["kind"]])

        panel_x = board_x + COLS * CELL + 50
        self.draw_text("SLEDEĆA FIGURA", panel_x, board_y, ACCENT, self.small)
        preview_cells = SHAPES[self.next_kind]
        min_row = min(row for row, _ in preview_cells)
        min_col = min(column for _, column in preview_cells)
        for row, column in preview_cells:
            self.draw_cell(panel_x + 25 + (column - min_col) * 25,
                           board_y + 45 + (row - min_row) * 25, COLORS[self.next_kind])
        self.draw_text(f"Skor: {self.score} / {TARGET_SCORE}", panel_x, board_y + 150)
        self.draw_text(f"Redovi: {self.lines}", panel_x, board_y + 190, MUTED, self.small)
        self.draw_text(f"Nivo: {self.level} / 5", panel_x, board_y + 225, MUTED, self.small)
        target = f"Sledeći nivo: {self.level * 1000}" if self.level < 5 else "Cilj: 5000"
        self.draw_text(target, panel_x, board_y + 260, ACCENT, self.small)
        self.draw_text("← →  Pomeranje", panel_x, board_y + 340, MUTED, self.small)
        self.draw_text("Klik / ↑  Rotacija", panel_x, board_y + 370, MUTED, self.small)
        self.draw_text("Space  Brže padanje", panel_x, board_y + 400, MUTED, self.small)
        replay = self.button((panel_x, board_y + 470, 190, 46), "Igraj ponovo", mouse, False)
        menu = self.button((panel_x, board_y + 525, 190, 46), "Izbor nivoa", mouse, False)
        return replay, menu

    def result_screen(self, mouse):
        """Prikaži pobedu ili poraz sa stalno dostupnim ponovnim pokušajem."""
        replay, menu = self.game_screen(mouse)
        overlay = pygame.Surface(self.screen.get_size(), pygame.SRCALPHA)
        overlay.fill((8, 10, 16, 205))
        self.screen.blit(overlay, (0, 0))
        color = SUCCESS if self.won else ERROR
        title = f"Čestitamo, {self.player_name}!" if self.won else f"Kraj igre, {self.player_name}"
        self.draw_text(title, self.screen.get_width() // 2, self.screen.get_height() // 2 - 80,
                       color, self.heading, center=True)
        self.draw_text(f"Skor: {self.score} poena", self.screen.get_width() // 2,
                       self.screen.get_height() // 2 - 24, TEXT, center=True)
        replay = pygame.Rect(self.screen.get_width() // 2 - 220,
                             self.screen.get_height() // 2 + 40, 200, 58)
        menu = pygame.Rect(self.screen.get_width() // 2 + 20,
                           self.screen.get_height() // 2 + 40, 200, 58)
        self.button(replay, "Igraj ponovo", mouse)
        self.button(menu, "Izbor nivoa", mouse, False)
        return replay, menu

    def run(self):
        """Obrađuj tastaturu i miš, i održavaj padanje figura u 60 FPS."""
        running = True
        while running:
            now = pygame.time.get_ticks()
            mouse = pygame.mouse.get_pos()
            setup_controls = None
            replay_rect = menu_rect = None
            if self.state == "setup":
                setup_controls = self.setup_screen(mouse)
            elif self.state == "playing":
                replay_rect, menu_rect = self.game_screen(mouse)
                delay = 45 if self.soft_drop else LEVEL_DELAYS[self.level - 1]
                if not self.game_over and now >= self.next_fall:
                    if not self.move(1, 0):
                        self.lock_piece()
                    self.next_fall = now + delay
            else:
                replay_rect, menu_rect = self.result_screen(mouse)
            exit_rect = self.button((self.screen.get_width() - 170,
                                     self.screen.get_height() - 62, 145, 42),
                                    "Izlaz", mouse, False)

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False
                    elif self.state == "setup":
                        if event.key == pygame.K_BACKSPACE:
                            self.name_text = self.name_text[:-1]
                        elif event.key == pygame.K_RETURN:
                            self.begin_game()
                        elif event.unicode and event.unicode.isprintable():
                            self.name_text += event.unicode
                    elif self.state == "playing":
                        if event.key == pygame.K_LEFT:
                            self.move(0, -1)
                        elif event.key == pygame.K_RIGHT:
                            self.move(0, 1)
                        elif event.key == pygame.K_UP:
                            self.rotate()
                        elif event.key == pygame.K_SPACE:
                            self.soft_drop = True
                elif event.type == pygame.KEYUP and event.key == pygame.K_SPACE:
                    self.soft_drop = False
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if exit_rect.collidepoint(event.pos):
                        running = False
                    elif self.state == "setup" and setup_controls:
                        name_rect, level_rects, start_rect = setup_controls
                        if name_rect.collidepoint(event.pos):
                            self.name_focused = True
                        for level, rect in enumerate(level_rects, 1):
                            if rect.collidepoint(event.pos):
                                self.chosen_level = level
                        if start_rect.collidepoint(event.pos):
                            self.begin_game()
                    elif self.state in ("playing", "result") and replay_rect:
                        if replay_rect.collidepoint(event.pos):
                            self.state = "playing"
                            self.new_game()
                        elif menu_rect.collidepoint(event.pos):
                            self.state = "setup"
                    elif self.state == "playing":
                        self.rotate()
            pygame.display.flip()
            self.clock.tick(60)
        pygame.quit()
        sys.exit()


def main():
    """Pokreni Pygame Tetris."""
    TetrisGame().run()


if __name__ == "__main__":
    main()
