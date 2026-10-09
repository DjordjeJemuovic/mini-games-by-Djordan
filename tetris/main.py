"""Jednostavan Tetris za jednog igrača, napravljen pomoću Tkinter-a."""

import random
import tkinter as tk


CELL_SIZE = 30
BOARD_COLUMNS = 10
BOARD_ROWS = 20
BACKGROUND = "#10131d"
PANEL = "#171c29"
GRID = "#30394f"
TEXT = "#f4f6ff"
MUTED = "#aeb8d0"
ACCENT = "#7dd3fc"
TARGET_SCORE = 5000
LEVEL_THRESHOLDS = (0, 1000, 2000, 3000, 4000)
LEVEL_DELAYS = (650, 520, 410, 310, 220)

# Svaka figura je lista koordinata (red, kolona) u matrici 4x4.
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
    "I": "#38bdf8", "O": "#facc15", "T": "#c084fc", "S": "#4ade80",
    "Z": "#fb7185", "J": "#60a5fa", "L": "#fb923c",
}
LINE_POINTS = [0, 100, 300, 500, 800]


class TetrisGame:
    """Cuva stanje igre i upravlja ekranima, potezima i bodovanjem."""

    def __init__(self, root):
        self.root = root
        self.root.title("Tetris | Mini Games by Djordan")
        self.root.configure(bg=BACKGROUND)
        self.root.resizable(False, False)

        self.player_name = ""
        self.start_level = 1
        self.board = []
        self.current = None
        self.next_kind = random.choice(list(SHAPES))
        self.score = 0
        self.lines = 0
        self.level = 1
        self.game_over = False
        self.soft_drop = False
        self.after_id = None

        self._build_ui()
        self.root.bind("<KeyPress>", self._on_key_down)
        self.root.bind("<KeyRelease-space>", self._on_space_release)

    def _build_ui(self):
        """Pravi pocetni ekran za ime/nivo i odvojeni ekran igre."""
        self.setup_frame = tk.Frame(self.root, bg=BACKGROUND, padx=36, pady=30)
        self.setup_frame.pack()
        tk.Label(self.setup_frame, text="TETRIS", bg=BACKGROUND, fg=TEXT,
                 font=("Segoe UI", 28, "bold")).pack(pady=(0, 8))
        tk.Label(self.setup_frame, text="Unesi ime i izaberi pocetni nivo",
                 bg=BACKGROUND, fg=MUTED, font=("Segoe UI", 11)).pack(pady=(0, 20))

        tk.Label(self.setup_frame, text="Ime igraca", bg=BACKGROUND, fg=TEXT,
                 font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.name_entry = tk.Entry(self.setup_frame, font=("Segoe UI", 12), width=28,
                                   bg=PANEL, fg=TEXT, insertbackground=TEXT,
                                   relief="flat")
        self.name_entry.pack(pady=(6, 18), ipady=7)
        tk.Label(self.setup_frame, text="Pocetni nivo (cilj za pobedu: 5000 poena)",
                 bg=BACKGROUND, fg=TEXT, font=("Segoe UI", 10, "bold")).pack(anchor="w")

        self.level_choice = tk.IntVar(value=1)
        level_panel = tk.Frame(self.setup_frame, bg=BACKGROUND)
        level_panel.pack(anchor="w", pady=(8, 18))
        for level, threshold in enumerate(LEVEL_THRESHOLDS, start=1):
            info = f"Nivo {level}  |  do {level * 1000} poena"
            if level == 5:
                info = "Nivo 5  |  cilj: pobeda na 5000"
            tk.Radiobutton(level_panel, text=info, variable=self.level_choice,
                           value=level, bg=BACKGROUND, fg=TEXT, selectcolor=PANEL,
                           activebackground=BACKGROUND, activeforeground=ACCENT,
                           font=("Segoe UI", 10)).pack(anchor="w", pady=2)

        self.setup_error = tk.Label(self.setup_frame, text="", bg=BACKGROUND,
                                    fg="#fb7185", font=("Segoe UI", 10))
        self.setup_error.pack()
        tk.Button(self.setup_frame, text="Zapocni igru", command=self._start_from_setup,
                  bg=ACCENT, fg=BACKGROUND, activebackground="#bae6fd",
                  relief="flat", font=("Segoe UI", 11, "bold"), padx=22,
                  pady=9, cursor="hand2").pack(pady=(8, 0))

        self.game_frame = tk.Frame(self.root, bg=BACKGROUND, padx=24, pady=20)
        tk.Label(self.game_frame, text="TETRIS", bg=BACKGROUND, fg=TEXT,
                 font=("Segoe UI", 24, "bold")).pack(anchor="w")
        self.player_label = tk.Label(self.game_frame, text="", bg=BACKGROUND,
                                     fg=MUTED, font=("Segoe UI", 10))
        self.player_label.pack(anchor="w", pady=(0, 12))

        content = tk.Frame(self.game_frame, bg=BACKGROUND)
        content.pack()
        self.canvas = tk.Canvas(
            content, width=BOARD_COLUMNS * CELL_SIZE, height=BOARD_ROWS * CELL_SIZE,
            bg="#0b0e16", highlightthickness=2, highlightbackground=GRID
        )
        self.canvas.pack(side="left")
        self.canvas.bind("<Button-1>", self._on_mouse_click)

        sidebar = tk.Frame(content, bg=PANEL, padx=16, pady=16, width=190)
        sidebar.pack(side="left", fill="y", padx=(16, 0))
        sidebar.pack_propagate(False)
        self._label(sidebar, "SLEDECA FIGURA", ACCENT, 9, bold=True).pack(anchor="w")
        self.preview = tk.Canvas(sidebar, width=150, height=100, bg=BACKGROUND,
                                 highlightthickness=0)
        self.preview.pack(anchor="w", pady=(8, 18))
        self.score_label = self._label(sidebar, "Skor: 0", TEXT, 14, bold=True)
        self.score_label.pack(anchor="w", pady=4)
        self.lines_label = self._label(sidebar, "Redovi: 0", MUTED, 11)
        self.lines_label.pack(anchor="w", pady=4)
        self.level_label = self._label(sidebar, "Nivo: 1", MUTED, 11)
        self.level_label.pack(anchor="w", pady=4)
        self.target_label = self._label(sidebar, "Sledeci nivo: 1000", MUTED, 10)
        self.target_label.pack(anchor="w", pady=4)
        self.status_label = self._label(sidebar, "", ACCENT, 10, bold=True, wraplength=155)
        self.status_label.pack(anchor="w", pady=(14, 4))
        self.replay_button = tk.Button(
            sidebar, text="Igraj ponovo", command=self.new_game,
            bg=ACCENT, fg=BACKGROUND, activebackground="#bae6fd",
            relief="flat", font=("Segoe UI", 10, "bold"), padx=10,
            pady=7, cursor="hand2"
        )
        self.replay_button.pack(anchor="w", fill="x", pady=(8, 4))
        self._label(sidebar, "Strelice levo/desno: pomeranje\nKlik misa: rotacija\nSpace: ubrzaj padanje\nR: nova igra",
                    MUTED, 9, justify="left").pack(anchor="w", side="bottom")

    @staticmethod
    def _label(parent, text, color, size, **kwargs):
        """Napravi tekstualnu oznaku u zajednickom stilu igre."""
        bold = kwargs.pop("bold", False)
        return tk.Label(parent, text=text, bg=parent.cget("bg"), fg=color,
                        font=("Segoe UI", size, "bold" if bold else "normal"), **kwargs)

    def _start_from_setup(self):
        """Proveri ime i pokreni partiju sa izabranim pocetnim nivoom."""
        name = self.name_entry.get().strip()
        if not name:
            self.setup_error.configure(text="Unesi ime igraca pre pocetka.")
            self.name_entry.focus_set()
            return
        self.player_name = name
        self.start_level = self.level_choice.get()
        self.setup_error.configure(text="")
        self.player_label.configure(text=f"Igrac: {self.player_name}")
        self.setup_frame.pack_forget()
        self.game_frame.pack()
        self.new_game()
        self.canvas.focus_set()

    def new_game(self):
        """Resetuje tablu, rezultat i tajmer, pa krece od izabranog nivoa."""
        if self.after_id is not None:
            self.root.after_cancel(self.after_id)
            self.after_id = None
        self.board = [[None for _ in range(BOARD_COLUMNS)] for _ in range(BOARD_ROWS)]
        self.score = 0
        self.lines = 0
        self.level = self.start_level
        self.game_over = False
        self.soft_drop = False
        self.next_kind = random.choice(list(SHAPES))
        self.status_label.configure(text="", fg=ACCENT)
        self._update_stats()
        self._spawn_piece()
        self._tick()

    def _spawn_piece(self):
        """Postavlja sledecu nasumicnu figuru na vrh table."""
        kind = self.next_kind
        self.next_kind = random.choice(list(SHAPES))
        self.current = {"kind": kind, "cells": list(SHAPES[kind]), "row": 0,
                        "column": (BOARD_COLUMNS - 4) // 2}
        self._draw_preview()
        if not self._fits(self.current["row"], self.current["column"], self.current["cells"]):
            self._end_game()

    def _fits(self, row, column, cells):
        """Proverava da li figura staje na poziciju bez izlaska/sudara."""
        for cell_row, cell_column in cells:
            board_row = row + cell_row
            board_column = column + cell_column
            if board_column < 0 or board_column >= BOARD_COLUMNS or board_row >= BOARD_ROWS:
                return False
            if board_row >= 0 and self.board[board_row][board_column] is not None:
                return False
        return True

    def _move(self, row_delta, column_delta):
        """Pomeraj aktivnu figuru ako je odredisna pozicija slobodna."""
        if self.game_over or self.current is None:
            return False
        row = self.current["row"] + row_delta
        column = self.current["column"] + column_delta
        if not self._fits(row, column, self.current["cells"]):
            return False
        self.current["row"] = row
        self.current["column"] = column
        self._draw()
        return True

    def _rotate(self):
        """Rotira figuru u smeru kazaljke na satu kada nova poza staje."""
        if self.game_over or self.current is None:
            return
        rotated = [(column, 3 - row) for row, column in self.current["cells"]]
        min_row = min(row for row, _ in rotated)
        min_column = min(column for _, column in rotated)
        rotated = [(row - min_row, column - min_column) for row, column in rotated]
        if self._fits(self.current["row"], self.current["column"], rotated):
            self.current["cells"] = rotated
            self._draw()

    def _on_mouse_click(self, _event):
        """Klik na tabli rotira figuru koja pada."""
        self._rotate()
        self.canvas.focus_set()

    def _on_key_down(self, event):
        """Obradi pomeranje, ubrzano padanje i restart preko tastature."""
        if event.keysym == "Left":
            self._move(0, -1)
        elif event.keysym == "Right":
            self._move(0, 1)
        elif event.keysym == "space" and self.game_frame.winfo_ismapped():
            self.soft_drop = True
        elif event.keysym.lower() == "r" and self.game_frame.winfo_ismapped():
            self.new_game()

    def _on_space_release(self, _event):
        """Vrati obicnu brzinu kada igrac pusti razmaknicu."""
        self.soft_drop = False

    def _tick(self):
        """Pomeri figuru za jedan korak i zakazi sledeci korak."""
        if self.game_over:
            self.after_id = None
            return
        if not self._move(1, 0):
            self._lock_piece()
        if self.game_over:
            self.after_id = None
            return
        self.after_id = self.root.after(self._fall_delay(), self._tick)

    def _fall_delay(self):
        """Vraca brzinu padanja za nivo; Space daje privremeni brzi pad."""
        if self.soft_drop:
            return 45
        return LEVEL_DELAYS[self.level - 1]

    def _lock_piece(self):
        """Zakljuca figuru, obradi redove i zavrsi pobedom ili porazom."""
        for cell_row, cell_column in self.current["cells"]:
            row = self.current["row"] + cell_row
            column = self.current["column"] + cell_column
            if row < 0:
                self._end_game()
                return
            self.board[row][column] = COLORS[self.current["kind"]]
        self._clear_full_rows()
        if self.score >= TARGET_SCORE:
            self._win_game()
            return
        self._spawn_piece()
        self._draw()

    def _clear_full_rows(self):
        """Ukloni popunjene redove, dodeli poene i azuriraj nivo."""
        remaining = [row for row in self.board if not all(cell is not None for cell in row)]
        cleared = BOARD_ROWS - len(remaining)
        if not cleared:
            return
        self.board = [[None for _ in range(BOARD_COLUMNS)] for _ in range(cleared)] + remaining
        self.score += LINE_POINTS[cleared] * self.level
        self.lines += cleared
        score_level = min(5, self.score // 1000 + 1)
        self.level = max(self.start_level, score_level)
        self._update_stats()

    def _update_stats(self):
        """Prikazi skor, linije, trenutni nivo i sledeci prag."""
        self.score_label.configure(text=f"Skor: {self.score} / {TARGET_SCORE}")
        self.lines_label.configure(text=f"Redovi: {self.lines}")
        self.level_label.configure(text=f"Nivo: {self.level} / 5")
        if self.level < 5:
            self.target_label.configure(text=f"Sledeci nivo: {self.level * 1000}")
        else:
            self.target_label.configure(text="Cilj za pobedu: 5000")

    def _draw_cell(self, canvas, column, row, color, size=CELL_SIZE):
        """Iscrtaj jedno obojeno polje sa tankom ivicom."""
        x1, y1 = column * size, row * size
        canvas.create_rectangle(x1, y1, x1 + size, y1 + size,
                                fill=color, outline=BACKGROUND, width=2)

    def _draw_preview(self):
        """Prikazi sledecu figuru u bocnom panelu."""
        self.preview.delete("all")
        cells = SHAPES[self.next_kind]
        min_row = min(row for row, _ in cells)
        min_column = min(column for _, column in cells)
        for row, column in cells:
            x = (column - min_column) * 24 + 28
            y = (row - min_row) * 24 + 12
            self.preview.create_rectangle(x, y, x + 24, y + 24,
                                          fill=COLORS[self.next_kind], outline=BACKGROUND, width=2)

    def _draw(self):
        """Iscrtaj zakljucana polja, mrezu i figuru koja trenutno pada."""
        self.canvas.delete("all")
        for row, board_row in enumerate(self.board):
            for column, color in enumerate(board_row):
                if color:
                    self._draw_cell(self.canvas, column, row, color)
        for row in range(BOARD_ROWS + 1):
            self.canvas.create_line(0, row * CELL_SIZE, BOARD_COLUMNS * CELL_SIZE,
                                    row * CELL_SIZE, fill=GRID)
        for column in range(BOARD_COLUMNS + 1):
            self.canvas.create_line(column * CELL_SIZE, 0, column * CELL_SIZE,
                                    BOARD_ROWS * CELL_SIZE, fill=GRID)
        if self.current:
            color = COLORS[self.current["kind"]]
            for row, column in self.current["cells"]:
                self._draw_cell(self.canvas, self.current["column"] + column,
                                self.current["row"] + row, color)

    def _win_game(self):
        """Zaustavi partiju i prikazi cestitku kada skor dostigne cilj."""
        self.game_over = True
        self.status_label.configure(
            text=f"Cestitamo, {self.player_name}!\nPobeda sa {self.score} poena!\nPritisni R za novu igru",
            fg="#4ade80",
        )
        self._draw()

    def _end_game(self):
        """Zaustavi partiju i prikazi igracu konacan rezultat."""
        self.game_over = True
        self.status_label.configure(
            text=f"Kraj igre, {self.player_name}\nSkor: {self.score}\nPritisni R za novu igru",
            fg="#fb7185",
        )
        self._draw()


def main():
    """Kreira Tkinter prozor i pokrece glavnu petlju dogadjaja."""
    root = tk.Tk()
    TetrisGame(root)
    root.mainloop()


if __name__ == "__main__":
    main()
