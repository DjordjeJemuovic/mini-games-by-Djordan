import tkinter as tk
from tkinter import messagebox


BACKGROUND = "#10131d"
PANEL = "#171c29"
SURFACE = "#20283a"
TEXT = "#f4f6ff"
MUTED = "#aeb8d0"
ACCENT = "#7dd3fc"
ERROR = "#fb7185"
SUCCESS = "#4ade80"
MAX_MISSES = 6


class HangmanGame:
    def __init__(self, root):
        self.root = root
        self.root.title("Vešanje | Mini Games by Djordan")
        self.root.configure(bg=BACKGROUND)
        self.root.minsize(760, 620)
        self.root.geometry("900x720")
        self.round_number = 0
        self.scores = {"one": 0, "two": 0}
        self.show_setup()

    def clear(self):
        for child in self.root.winfo_children():
            child.destroy()

    def frame(self, parent, **kwargs):
        return tk.Frame(parent, bg=kwargs.pop("bg", PANEL), **kwargs)

    def label(self, parent, text, **kwargs):
        options = {"bg": PANEL, "fg": TEXT, "font": ("Segoe UI", 12)}
        options.update(kwargs)
        return tk.Label(parent, text=text, **options)

    def button(self, parent, text, command, **kwargs):
        return tk.Button(
            parent, text=text, command=command, bg=ACCENT, fg=BACKGROUND,
            activebackground="#a5e3ff", activeforeground=BACKGROUND,
            font=("Segoe UI", 11, "bold"), relief="flat", padx=18, pady=10,
            cursor="hand2", **kwargs
        )

    def show_setup(self):
        self.clear()
        outer = self.frame(self.root, padx=36, pady=28)
        outer.pack(fill="both", expand=True, padx=24, pady=24)
        self.label(outer, "MINI GAMES BY DJORDAN", fg=ACCENT, font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.label(outer, "Igra vešanja", font=("Segoe UI", 30, "bold")).pack(anchor="w", pady=(6, 4))
        self.label(outer, "Igrač 1 zadaje reč i zagonetku, a igrač 2 otkriva reč slovo po slovo.", fg=MUTED, wraplength=740, justify="left").pack(anchor="w", pady=(0, 20))

        fields = self.frame(outer, bg=SURFACE, padx=20, pady=18)
        fields.pack(fill="x")
        self.player_one = self.add_field(fields, "Ime igrača koji zadaje reč", "Igrač 1")
        self.player_two = self.add_field(fields, "Ime igrača koji pogađa", "Igrač 2")
        self.clue_entry = self.add_field(fields, "Zagonetka ili opis reči", "Unesi zagonetku")
        self.word_entry = self.add_field(fields, "Tajna reč (neka drugi igrač ne gleda)", "Unesi reč")
        self.word_entry.bind("<Return>", lambda _event: self.start_handoff())
        self.button(outer, "Zadaj reč", self.start_handoff).pack(anchor="e", pady=(18, 0))
        self.label(outer, "Pogađač ima 6 pokušaja. Koriste se slova latinice, uključujući Č, Ć, Š, Ž i Đ. Razmaci i crtice se otkrivaju automatski.", fg=MUTED, font=("Segoe UI", 10), wraplength=740, justify="left").pack(anchor="w", side="bottom", pady=(24, 0))

    def add_field(self, parent, caption, placeholder):
        group = self.frame(parent, bg=SURFACE)
        group.pack(fill="x", pady=7)
        self.label(group, caption, bg=SURFACE, fg=MUTED, font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(0, 5))
        entry = tk.Entry(group, font=("Segoe UI", 12), bg=BACKGROUND, fg=TEXT, insertbackground=TEXT, relief="flat")
        entry.pack(fill="x", ipady=9)
        entry.insert(0, placeholder)
        entry.bind("<FocusIn>", lambda _event, widget=entry, hint=placeholder: self.clear_hint(widget, hint))
        return entry

    @staticmethod
    def clear_hint(entry, hint):
        if entry.get() == hint:
            entry.delete(0, "end")

    def start_handoff(self):
        name_one = self.player_one.get().strip()
        name_two = self.player_two.get().strip()
        clue = self.clue_entry.get().strip()
        word = self.word_entry.get().strip()
        if name_one in ("", "Igrač 1") or name_two in ("", "Igrač 2"):
            messagebox.showwarning("Nedostaju imena", "Unesite imena oba igrača.", parent=self.root)
            return
        if clue in ("", "Unesi zagonetku") or word in ("", "Unesi reč"):
            messagebox.showwarning("Nedostaju podaci", "Unesite zagonetku i tajnu reč.", parent=self.root)
            return
        if not any(char.isalpha() for char in word):
            messagebox.showwarning("Neispravna reč", "Tajna reč mora da sadrži bar jedno slovo.", parent=self.root)
            return
        self.name_one, self.name_two = name_one, name_two
        self.clue = clue
        self.word = word.upper()
        self.hint = " ".join("_" if char.isalpha() else char for char in self.word)
        self.guessed = set()
        self.misses = 0
        self.round_number += 1
        self.show_handoff()

    def show_handoff(self):
        self.clear()
        outer = self.frame(self.root, padx=40, pady=40)
        outer.pack(fill="both", expand=True, padx=24, pady=24)
        self.label(outer, f"REČ JE ZADATA · RUNDA {self.round_number}", fg=ACCENT, font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.label(outer, f"Sada igra {self.name_two}", font=("Segoe UI", 30, "bold")).pack(anchor="w", pady=(12, 8))
        self.label(outer, f"{self.name_one}, predaj ekran {self.name_two}.\nTajna reč će sada biti sakrivena.", fg=MUTED, font=("Segoe UI", 14), justify="left").pack(anchor="w", pady=(0, 28))
        self.button(outer, "Predao sam ekran — počni", self.start_round).pack(anchor="w")

    def start_round(self):
        self.clear()
        outer = self.frame(self.root, padx=24, pady=20)
        outer.pack(fill="both", expand=True, padx=18, pady=18)
        header = self.frame(outer)
        header.pack(fill="x")
        self.label(header, f"{self.name_one}  ·  ZAGONETKA", fg=ACCENT, font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.label(header, self.clue, font=("Segoe UI", 18, "bold"), wraplength=800, justify="left").pack(anchor="w", pady=(5, 2))
        self.label(header, f"Pogađa: {self.name_two}     Rezultat: {self.name_one} {self.scores['one']} : {self.scores['two']} {self.name_two}", fg=MUTED, font=("Segoe UI", 10)).pack(anchor="w", pady=(0, 8))

        content = self.frame(outer)
        content.pack(fill="both", expand=True, pady=8)
        self.canvas = tk.Canvas(content, width=270, height=280, bg=SURFACE, highlightthickness=0)
        self.canvas.pack(side="left", fill="y", padx=(0, 20))
        self.draw_hangman()

        right = self.frame(content)
        right.pack(side="left", fill="both", expand=True)
        self.word_label = self.label(right, self.hint, font=("Consolas", 24, "bold"), wraplength=510, justify="left")
        self.word_label.pack(anchor="w", pady=(8, 16))
        self.misses_label = self.label(right, f"Greške: 0 / {MAX_MISSES}", fg=MUTED)
        self.misses_label.pack(anchor="w", pady=(0, 10))
        self.keyboard = self.frame(right)
        self.keyboard.pack(anchor="w", fill="x")
        self.build_keyboard()
        self.status_label = self.label(right, "Izaberi slovo.", fg=MUTED, wraplength=500, justify="left")
        self.status_label.pack(anchor="w", pady=(14, 0))

    def build_keyboard(self):
        letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZČĆŠŽĐ"
        for index, letter in enumerate(letters):
            button = tk.Button(self.keyboard, text=letter, width=3, command=lambda char=letter: self.guess(char), bg=SURFACE, fg=TEXT, activebackground=ACCENT, activeforeground=BACKGROUND, relief="flat", font=("Segoe UI", 11, "bold"), cursor="hand2")
            button.grid(row=index // 7, column=index % 7, padx=3, pady=3, ipadx=2, ipady=5)

    def guess(self, letter):
        if letter in self.guessed:
            return
        self.guessed.add(letter)
        for button in self.keyboard.winfo_children():
            if button.cget("text") == letter:
                button.configure(state="disabled", bg="#30394f", fg=MUTED)
                break
        if letter in self.word:
            self.status_label.configure(text=f"Slovo {letter} je u reči!", fg=SUCCESS)
        else:
            self.misses += 1
            self.misses_label.configure(text=f"Greške: {self.misses} / {MAX_MISSES}", fg=ERROR if self.misses >= MAX_MISSES - 1 else MUTED)
            self.status_label.configure(text=f"Slovo {letter} nije u reči.", fg=ERROR)
            self.draw_hangman()
        self.hint = " ".join(char if not char.isalpha() or char in self.guessed else "_" for char in self.word)
        self.word_label.configure(text=self.hint)
        if all(not char.isalpha() or char in self.guessed for char in self.word):
            self.finish_round(won=True)
        elif self.misses >= MAX_MISSES:
            self.finish_round(won=False)

    def draw_hangman(self):
        canvas = self.canvas
        canvas.delete("all")
        wood = "#aeb8d0"
        canvas.create_line(35, 250, 190, 250, fill=wood, width=5)
        canvas.create_line(75, 250, 75, 35, fill=wood, width=5)
        canvas.create_line(75, 35, 185, 35, fill=wood, width=5)
        canvas.create_line(185, 35, 185, 65, fill=wood, width=4)
        color = ERROR
        parts = [
            lambda: canvas.create_oval(165, 65, 205, 105, outline=color, width=4),
            lambda: canvas.create_line(185, 105, 185, 165, fill=color, width=4),
            lambda: canvas.create_line(185, 118, 155, 145, fill=color, width=4),
            lambda: canvas.create_line(185, 118, 215, 145, fill=color, width=4),
            lambda: canvas.create_line(185, 165, 158, 205, fill=color, width=4),
            lambda: canvas.create_line(185, 165, 212, 205, fill=color, width=4),
        ]
        for draw_part in parts[:self.misses]:
            draw_part()

    def finish_round(self, won):
        for button in self.keyboard.winfo_children():
            button.configure(state="disabled")
        if won:
            self.scores["two"] += 1
            title = f"Bravo, {self.name_two}!"
            message = f"Pogodio/la si reč: {self.word}"
            color = SUCCESS
        else:
            self.scores["one"] += 1
            title = f"Ovog puta pobeđuje {self.name_one}!"
            message = f"Cela figura je iscrtana. Reč je bila: {self.word}"
            color = ERROR
        self.status_label.configure(text=f"{title}\n{message}\n\nRezultat: {self.name_one} {self.scores['one']} : {self.scores['two']} {self.name_two}", fg=color, font=("Segoe UI", 13, "bold"))
        self.button(self.root, "Nova runda", self.show_setup).pack(pady=(0, 18))


def main():
    root = tk.Tk()
    HangmanGame(root)
    root.mainloop()


if __name__ == "__main__":
    main()
