const REVOKE_DELAY_MS = 1000

export function downloadText(filename: string, mime: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revogar na hora pode cancelar o download em alguns navegadores.
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

const CLEANUP_FALLBACK_MS = 60_000

/** Imprime o HTML (o diálogo do navegador permite salvar como PDF) sem sair da página. */
export function printHtml(html: string): void {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  // Fora da tela, mas renderizado: alguns navegadores não imprimem iframe com display:none.
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0;visibility:hidden'
  let timer: ReturnType<typeof setTimeout> | undefined
  const cleanup = () => {
    clearTimeout(timer)
    frame.remove()
  }
  frame.addEventListener(
    'load',
    () => {
      const win = frame.contentWindow
      if (!win) return cleanup()
      win.addEventListener('afterprint', cleanup, { once: true })
      timer = setTimeout(cleanup, CLEANUP_FALLBACK_MS)
      win.focus()
      win.print()
    },
    { once: true },
  )
  frame.srcdoc = html
  document.body.appendChild(frame)
}
