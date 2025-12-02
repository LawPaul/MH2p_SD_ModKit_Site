# MH2p SD ModKit site
Site for free ModKit that allows for modifying the MH2p unit used in some Volkswagen AG vehicles using only an SD card.
## License
 - This file is part of MH2p_SD_ModKit_Site, licensed under CC BY-NC-SA 4.0.
 - https://creativecommons.org/licenses/by-nc-sa/4.0/
 - See the LICENSE file in the project root for full license text.
 - NOT FOR COMMERCIAL USE
 ## Contact
 - [GitHub](https://github.com/LawPaul)
 - [Macan Forum](https://www.macanforum.com/members/carmines.174281/)
 - [DRIVE2](https://www.drive2.ru/users/lawsen/)
 - [Discord](https://discordapp.com/users/lawsen5734)

## Mod Bundle Builder (new)

This site includes a client-side Mod Bundle Builder that lets you pick one or more mods from the existing mod listings plus the Mod Kit and download a single packaged ZIP. The bundle is assembled entirely in your browser — nothing is uploaded to any server.

How it works:
- The page fetches each selected mod ZIP and the Mod Kit ZIP from the links already present on the page.
- Each archive is unzipped in the browser; mod files are moved under Mods/[mod-id]/ inside the Mod Kit structure.
- The browser re-zips the final structure and downloads it as a single .zip file.

Usage:
- Open the page and find the "Mod Bundle Builder" panel.
- Tick the checkbox to include the Mod Kit (default), select the mods you want and click "Download Bundle (.zip)".

Notes:
- This is a client-side convenience tool. If any repository blocks cross-origin requests for the zip assets, fetching may fail in the browser. In that case download the individual ZIPs and assemble locally.