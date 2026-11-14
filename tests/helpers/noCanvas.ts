// jsdom não implementa canvas e avisa a cada getContext; devolve null em silêncio (como um navegador sem canvas).
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext']
}
