// BlueMap loads custom scripts after its map. Cancel the deferred initial camera animation.
const initial = (window.nomadInitialHash || '').slice(1).split(':');
const app = window.bluemap;
if (initial.length === 10 && app?.mapViewer.map?.data.id === initial[0]) {
  app.viewAnimation?.cancel();
  const controls = app.mapViewer.controlsManager;
  controls.position.set(Number(initial[1]), Number(initial[2]), Number(initial[3]));
  ['distance', 'rotation', 'angle', 'tilt', 'ortho'].forEach((key, i) => { controls[key] = Number(initial[i + 4]); });
  controls.controls = initial[9] === 'free' ? app.freeFlightControls : app.mapControls;
  app.appState.controls.state = initial[9];
  app.updatePageAddress();
  app.mapViewer.updateLoadedMapArea();
}
