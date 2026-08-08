# DJ Tube Downloads

DJ Tube supports a multi-download queue for **authorized media sources**.

Download modes:

- Original — save the source file unchanged.
- Audio only — requires an authorized transcoder for the source.
- Video only — requires an authorized transcoder for the source.

The browser can download local DJ-owned files and authorized HTTPS media. The queue supports multiple simultaneous jobs and progress reporting.

## YouTube boundary

The application does not extract, decrypt, or download YouTube media from an embedded player, and it does not bypass YouTube advertising or playback controls. The official YouTube APIs expose metadata/search capabilities, not a general-purpose downloadable media endpoint. If a rights holder supplies an authorized downloadable file/URL, that source can be passed to the download manager.

## UI target

The controller should expose a **DOWNLOAD** action with:

- Original
- Audio Only
- Video Only
- Add to Download Queue
- Queue progress
- Completed downloads
- Retry failed download
- Clear completed

For multiple selected tracks, the UI should add each authorized source to the queue and process them independently.
