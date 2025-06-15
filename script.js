let filename = "";
      const chooseFileBtn = document.getElementById("chooseFileBtn");
      const removeFileBtn = document.getElementById("removeFileBtn");
      const downloadBtn = document.getElementById("downloadBtn");
      const fileInput = document.getElementById("fileInput");
      const lyricsDiv = document.getElementById("lyrics");
      const contextMenu = document.getElementById("contextMenu");
      const fileNameDisplay = document.getElementById("fileNameDisplay");

      const chordTypes = {
        Major: (note) => note,
        Minor: (note) => note + "m",
        "7th": (note) => note + "7",
        sus: (note) => note + "sus",
        sus4: (note) => note + "sus4",
        add9: (note) => note + "add9",
        Major7th: (note) => note + "M7",
        diminished: (note) => note + "dim",
        augmented: (note) => note + "aug",
      };

      const notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
      ];

      const undoStack = [];

      chooseFileBtn.onclick = () => fileInput.click();

      fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (file) {
          fileNameDisplay.innerText = file.name;
          filename = file.name;
          const reader = new FileReader();
          reader.onload = (e) => {
            const lines = e.target.result
              .replace(/\r\n|\r|\n/g, "\n")
              .split("\n");
            lyricsDiv.innerHTML = lines
              .map((line) => line.trim())
              .filter((line) => line !== "")
              .map(
                (line) =>
                  `<div><div class='chord-line'></div><div class='lyric-line'>${line}</div></div>`
              )
              .join("");
          };
          reader.readAsText(file);
        }
      };

      removeFileBtn.onclick = () => {
        lyricsDiv.innerHTML = "";
        fileInput.value = "";
        fileNameDisplay.innerText = "";
        filename = "";
      };

      downloadBtn.onclick = () => {
        let output = "";
        lyricsDiv.querySelectorAll("div").forEach((pair) => {
          const chords = pair.querySelector(".chord-line");
          const lyric = pair.querySelector(".lyric-line")?.innerText || "";

          if (!lyric.trim()) return;

          let chordLine = Array(lyric.length + 20).fill(" ");

          if (chords && chords.children.length) {
            Array.from(chords.children).forEach((span) => {
              const offsetLeft = parseInt(span.style.left || "0");
              const testSpan = document.createElement("span");
              testSpan.style.visibility = "hidden";
              testSpan.style.position = "absolute";
              testSpan.innerText = "M"; // widest character
              chords.appendChild(testSpan);
              const charWidth = testSpan.getBoundingClientRect().width;
              testSpan.remove();

              const charPos = Math.round(offsetLeft / charWidth);
              const chordText = span.innerText;
              for (let i = 0; i < chordText.length; i++) {
                if (charPos + i < chordLine.length) {
                  chordLine[charPos + i] = chordText[i];
                }
              }
            });
          }

          const formattedChordLine = chordLine.join("").trimEnd();
          if (formattedChordLine || lyric.trim()) {
            output += formattedChordLine + "\n" + lyric + "\n";
          }
        });

        output = output.trimEnd(); // remove trailing blank lines
        let inter = "Inter";
        let intro1 = "Intro 1\n";
        let intro2 = "Intro 2\n";
        inter = inter + "\n" + document.getElementById("interText").value;
        intro1 = intro1 + "\n" + document.getElementById("intro1Text").value;
        intro2 = intro2 + "\n" + document.getElementById("intro2Text").value;
        output = output.replace("INTER", inter);
        output = output.replace("INTRO1", intro1);
        output = output.replace("INTRO2", intro2);

        const blob = new Blob([output], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename.replace(".txt", "").concat("_with_chords.txt");
        a.click();
        URL.revokeObjectURL(url);
      };

      lyricsDiv.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        if (!e.target.classList.contains("lyric-line")) return;

        const line = e.target;
        const offsetX = e.offsetX;

        contextMenu.innerHTML = "";

        Object.entries(chordTypes).forEach(([type, formatter]) => {
          const li = document.createElement("li");
          li.innerText = type;
          const submenu = document.createElement("ul");

          notes.forEach((note) => {
            const subLi = document.createElement("li");
            const chordText = formatter(note);
            subLi.innerText = chordText;
            subLi.onmousedown = (ev) => {
              ev.preventDefault();
              const chordEl = document.createElement("span");
              chordEl.classList.add("chord");
              chordEl.setAttribute("draggable", true);
              chordEl.innerText = chordText;
              chordEl.style.left = `${offsetX}px`;

              chordEl.oncontextmenu = (e) => {
                e.preventDefault();
                chordEl.remove();
              };

              chordEl.ondragstart = (e) => {
                e.dataTransfer.setData("text/plain", e.target.outerHTML);
                e.target.remove();
              };

              const targetChordLine = line.previousElementSibling;
              targetChordLine.appendChild(chordEl);

              makeDraggable(chordEl);
              undoStack.push(targetChordLine.innerHTML);

              contextMenu.style.display = "none";
            };

            submenu.appendChild(subLi);
          });

          li.appendChild(submenu);
          contextMenu.appendChild(li);
        });

        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.display = "block";
      });

      document.body.addEventListener(
        "click",
        () => (contextMenu.style.display = "none")
      );

      function makeDraggable(el) {
        el.addEventListener("dragend", function (e) {
          const newLeft =
            e.pageX - el.parentElement.getBoundingClientRect().left;
          el.style.left = `${newLeft}px`;
          undoStack.push(el.parentElement.innerHTML);
        });
      }

      document.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "z") {
          const last = undoStack.pop();
          if (last && document.activeElement.classList.contains("chord-line")) {
            document.activeElement.innerHTML = last;
          }
        }
      });