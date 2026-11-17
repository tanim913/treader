# Chapter audio with Kokoro

Narration is made on a free cloud GPU (Google Colab or Kaggle), so your own computer does no work. Kokoro is an open-source voice model that sounds close to a human reader.

Audio is **off for every book** until an admin switches it on, and you choose which chapters get narrated. That keeps the free storage under control.

## Steps

1. **Pick the chapters.**
   - On treader, open the book under **Write**. Admins see an **Audio narration** section.
   - Tick the chapters you want and press **Download text for narration**.
   - You get `<book>-narration.zip`, with one text file per chapter.
2. **Run the notebook.** Open [kokoro_narrate.ipynb](kokoro_narrate.ipynb) in one of these:
   - **Colab:** go to colab.research.google.com, then File, then Upload notebook. Set Runtime, then Change runtime type, to **T4 GPU**. Run the cells in order; the third cell asks for the zip.
   - **Kaggle:** create a new notebook and import this file. In Settings, set **Accelerator** to GPU T4 and turn Internet on. Add the zip with *Add Input*, then *Upload*, and run all cells.

   It takes about a minute per chapter on a GPU. The last cell gives you `treader-audio.zip` of `ch01.mp3`, `ch02.mp3` and so on.
3. **Upload.**
   - Unzip the file.
   - Back on the book's page, choose the voice you narrated with (George or Heart), then press **Upload … MP3s** and choose the files. Each file goes to the chapter its name says.
   - A chapter can have both voices. Readers switch between them in the player.
4. **Switch it on.** Turn on **Audio narration for this book**. Readers then get a headphones button in the reader, and a headphones mark beside those chapters in the Contents.

**Voices:** change `VOICE` in cell 2. The app offers two voices, `bm_george` (George, British) and `af_heart` (Heart, American). Others work in the notebook, but the app needs adding to before it can play them.

| Voice | Accent |
|---|---|
| `af_heart` (the default, the clearest), `af_bella`, `am_michael`, `am_fenrir` | American |
| `bf_emma`, `bm_george`, `bm_fable` | British |

**Reader requests:** signed-in readers can ask for a chapter's or a whole book's audio. The requests are listed under **Audio requests** in `/admin`, with a link to narrate any book, and readers who asked see "Now with audio" on their home page once it's ready.

## Storage and downloads (Supabase free plan)

- **Size per chapter.** A chapter of about 2,500 words runs about 17 minutes, which is about 6 MB at 48 kbps.
- **Storage limit.** File storage is about 1 GB in all, shared with covers and profile photos. That's roughly 150 chapters of audio. The **Storage** meter on the book's page shows how much audio uses.
- **Monthly download limit.** Every play downloads the chapter. The free plan allows about 5 GB of downloads a month, roughly 800 chapter plays. This limit usually runs out before storage does.
- **Freeing space.** Select chapters and press **Remove audio**. Deleting a chapter or book also removes its audio.
- **If it outgrows the free plan.** The files can move to Cloudflare R2 (10 GB free and no download charges) without changing how the app works for readers.

Check the current limits on Supabase's pricing page; they change from time to time.

## Protection

- Audio files are private.
- A reader's browser gets a link to a chapter's file that works for one hour, and only for live chapters of books with audio switched on.
- Anyone listening can still record or transcribe the audio. Like screenshots, that can't be prevented.
