// Re-exports the Leaflet instance already loaded via the classic <script> tag,
// so the ESM MapTiler plugin extends the same L used by the rest of the app
// (avoids pulling a second, incompatible copy of Leaflet).
export default window.L;
