"""Pygame desktop igra vešanja za dva igrača."""

import sys
import pygame


BG = (16, 19, 29)
PANEL = (23, 28, 41)
SURFACE = (32, 40, 58)
TEXT = (244, 246, 255)
MUTED = (174, 184, 208)
ACCENT = (125, 211, 252)
ERROR = (251, 113, 133)
SUCCESS = (74, 222, 128)
LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZČĆŠŽĐ"
MAX_MISSES = 6


class HangmanGame:
    """Čuva stanje vešanja i crta njegove ekrane pomoću Pygame-a."""

    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Vešanje | Mini Games by Djordan")
        self.screen = pygame.display.set_mode((1180, 800), pygame.FULLSCREEN)
        self.clock = pygame.time.Clock()
        self.font = pygame.font.SysFont("segoeui", 22)
        self.small = pygame.font.SysFont("segoeui", 16)
        self.heading = pygame.font.SysFont("segoeui", 42, bold=True)
        self.state = "setup"
        self.fields = ["", "", "", ""]
        self.focused = 0
        self.message = ""
        self.scores = [0, 0]
        self.round_number = 0

    def draw_text(self, text, position, color=TEXT, font=None, center=False):
        """Prikaži tekst na trenutnom ekranu."""
        image = (font or self.font).render(text, True, color)
        rect = image.get_rect(center=position) if center else image.get_rect(topleft=position)
        self.screen.blit(image, rect)

    def draw_button(self, rect, label, mouse, primary=True):
        """Nacrtaj klikabilno dugme i vrati njegov pravougaonik."""
        shape = pygame.Rect(rect)
        color = ACCENT if primary else SURFACE
        if shape.collidepoint(mouse):
            color = (165, 227, 255) if primary else (48, 59, 79)
        pygame.draw.rect(self.screen, color, shape, border_radius=11)
        self.draw_text(label, shape.center, BG if primary else TEXT, self.small, center=True)
        return shape

    def setup_screen(self, mouse):
        """Ekran unosa imena, zagonetke i reči koju treba pogoditi."""
        self.screen.fill(BG)
        self.draw_text("MINI GAMES BY DJORDAN", (90, 60), ACCENT, self.small)
        self.draw_text("Igra vešanja", (90, 94), TEXT, self.heading)
        captions = ("Ime igrača koji zadaje reč", "Ime igrača koji pogađa",
                    "Zagonetka ili opis", "Tajna reč (sakrij od drugog igrača)")
        rects = []
        for index, caption in enumerate(captions):
            y = 190 + index * 112
            self.draw_text(caption, (105, y), MUTED, self.small)
            rect = pygame.Rect(105, y + 27, 970, 54)
            rects.append(rect)
            pygame.draw.rect(self.screen, (42, 54, 75) if index == self.focused else SURFACE,
                             rect, border_radius=9)
            value = "•" * len(self.fields[index]) if index == 3 else self.fields[index]
            self.draw_text(value or "Klikni ovde i unesi tekst...", (rect.x + 14, rect.y + 14),
                           TEXT if value else (110, 120, 142), self.small)
        self.draw_text(self.message or "Pogađač ima 6 pokušaja. Razmaci i crtice se otkrivaju automatski.",
                       (105, 660), ERROR if self.message else MUTED, self.small)
        button = self.draw_button((865, 710, 210, 52), "Zadaj reč", mouse)
        return rects, button

    def submit_setup(self):
        """Validiraj unose i pripremi sledeću rundu."""
        name_one, name_two, clue, word = [value.strip() for value in self.fields]
        if not all((name_one, name_two, clue, word)) or not any(char.isalpha() for char in word):
            self.message = "Popuni sva polja i unesi reč koja sadrži slovo."
            return
        self.name_one, self.name_two = name_one, name_two
        self.clue, self.word = clue, word.upper()
        self.guessed = set()
        self.misses = 0
        self.round_number += 1
        self.hint = " ".join("_" if char.isalpha() else char for char in self.word)
        self.message = ""
        self.state = "handoff"

    def handoff_screen(self, mouse):
        """Ekran za predaju uređaja bez otkrivanja skrivene reči."""
        self.screen.fill(BG)
        self.draw_text(f"RUNDA {self.round_number}", (100, 100), ACCENT, self.small)
        self.draw_text(f"Sada igra {self.name_two}", (100, 150), TEXT, self.heading)
        self.draw_text(f"{self.name_one}, predaj ekran {self.name_two}.", (100, 230), MUTED)
        self.draw_text("Tajna reč je sakrivena.", (100, 270), MUTED)
        return self.draw_button((100, 340, 260, 58), "Predao sam ekran", mouse)

    def draw_hangman(self):
        """Crta vešala i dodaje deo figure za svaku grešku."""
        color = MUTED
        pygame.draw.line(self.screen, color, (755, 570), (1050, 570), 7)
        pygame.draw.line(self.screen, color, (820, 570), (820, 180), 7)
        pygame.draw.line(self.screen, color, (820, 180), (970, 180), 7)
        pygame.draw.line(self.screen, color, (970, 180), (970, 230), 6)
        parts = [
            lambda: pygame.draw.circle(self.screen, ERROR, (970, 263), 32, 5),
            lambda: pygame.draw.line(self.screen, ERROR, (970, 295), (970, 395), 5),
            lambda: pygame.draw.line(self.screen, ERROR, (970, 325), (925, 365), 5),
            lambda: pygame.draw.line(self.screen, ERROR, (970, 325), (1015, 365), 5),
            lambda: pygame.draw.line(self.screen, ERROR, (970, 395), (930, 455), 5),
            lambda: pygame.draw.line(self.screen, ERROR, (970, 395), (1010, 455), 5),
        ]
        for draw_part in parts[:self.misses]:
            draw_part()

    def play_screen(self, mouse):
        """Prikaži zagonetku, napredak reči i virtuelnu tastaturu."""
        self.screen.fill(BG)
        self.draw_text(f"{self.name_one} · ZAGONETKA", (55, 32), ACCENT, self.small)
        self.draw_text(self.clue, (55, 70), TEXT, self.font)
        self.draw_text(f"Pogađa: {self.name_two}    Rezultat: {self.scores[0]} : {self.scores[1]}",
                       (55, 112), MUTED, self.small)
        self.draw_text(self.hint, (55, 185), TEXT, self.heading)
        self.draw_text(f"Greške: {self.misses} / {MAX_MISSES}", (55, 250),
                       ERROR if self.misses >= MAX_MISSES - 1 else MUTED)
        self.draw_hangman()
        keys = {}
        for index, letter in enumerate(LETTERS):
            row, column = divmod(index, 8)
            rect = pygame.Rect(55 + column * 60, 330 + row * 58, 50, 46)
            keys[letter] = rect
            color = (48, 57, 79) if letter in self.guessed else SURFACE
            pygame.draw.rect(self.screen, color, rect, border_radius=8)
            self.draw_text(letter, rect.center, MUTED if letter in self.guessed else TEXT,
                           self.small, center=True)
        self.draw_text("Klikni slovo ili koristi tastaturu.", (55, 570), MUTED, self.small)
        return keys

    def choose_letter(self, letter):
        """Obradi pogađanje i završi rundu ako je reč rešena ili pokušaji potrošeni."""
        letter = letter.upper()
        if letter not in LETTERS or letter in self.guessed or self.state != "play":
            return
        self.guessed.add(letter)
        if letter not in self.word:
            self.misses += 1
        self.hint = " ".join(char if not char.isalpha() or char in self.guessed else "_" for char in self.word)
        if all(not char.isalpha() or char in self.guessed for char in self.word):
            self.scores[1] += 1
            self.round_won = True
            self.message = f"Bravo, {self.name_two}! Pogodio/la si reč: {self.word}"
            self.state = "result"
        elif self.misses >= MAX_MISSES:
            self.scores[0] += 1
            self.round_won = False
            self.message = f"Pobeđuje {self.name_one}! Reč je bila: {self.word}"
            self.state = "result"

    def result_screen(self, mouse):
        """Prikaži pobednika, reč i rezultat cele sesije."""
        self.screen.fill(BG)
        color = SUCCESS if self.round_won else ERROR
        self.draw_text("RUNDA ZAVRŠENA", (100, 130), ACCENT, self.small)
        self.draw_text(self.message, (100, 190), color, self.heading)
        self.draw_text(f"Rezultat: {self.name_one} {self.scores[0]} : {self.scores[1]} {self.name_two}",
                       (100, 270), MUTED)
        return self.draw_button((100, 350, 220, 58), "Nova runda", mouse)

    def run(self):
        """Obrađuje Pygame događaje i crta odgovarajući ekran u 60 FPS."""
        running = True
        while running:
            mouse = pygame.mouse.get_pos()
            click_targets = []
            if self.state == "setup":
                fields, button = self.setup_screen(mouse)
                click_targets = [("field", index, rect) for index, rect in enumerate(fields)]
                click_targets.append(("setup", 0, button))
            elif self.state == "handoff":
                click_targets = [("handoff", 0, self.handoff_screen(mouse))]
            elif self.state == "play":
                click_targets = [("letter", letter, rect) for letter, rect in self.play_screen(mouse).items()]
            else:
                click_targets = [("result", 0, self.result_screen(mouse))]
            exit_rect = self.draw_button((self.screen.get_width() - 180,
                                          self.screen.get_height() - 65, 155, 44),
                                         "Izlaz", mouse, False)

            for event in pygame.event.get():
                if event.type == pygame.QUIT or (event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE):
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if self.state == "setup":
                        if event.key == pygame.K_TAB:
                            self.focused = (self.focused + 1) % len(self.fields)
                        elif event.key == pygame.K_BACKSPACE:
                            self.fields[self.focused] = self.fields[self.focused][:-1]
                        elif event.key == pygame.K_RETURN:
                            self.submit_setup()
                        elif event.unicode and event.unicode.isprintable():
                            self.fields[self.focused] += event.unicode
                    elif self.state == "play":
                        self.choose_letter(event.unicode)
                elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                    if exit_rect.collidepoint(event.pos):
                        running = False
                        continue
                    for kind, value, rect in click_targets:
                        if not rect.collidepoint(event.pos):
                            continue
                        if kind == "field":
                            self.focused = value
                        elif kind == "setup":
                            self.submit_setup()
                        elif kind == "handoff":
                            self.state = "play"
                        elif kind == "letter":
                            self.choose_letter(value)
                        elif kind == "result":
                            self.fields = [self.name_one, self.name_two, "", ""]
                            self.state = "setup"
                        break
            pygame.display.flip()
            self.clock.tick(60)
        pygame.quit()
        sys.exit()


def main():
    """Pokreni Pygame verziju vešanja."""
    HangmanGame().run()


if __name__ == "__main__":
    main()
