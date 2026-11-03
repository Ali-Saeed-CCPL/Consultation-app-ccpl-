/* Print one element on its own — a prescription — in a clean light
   window; the browser's "Save as PDF" there gives the file, named by `title`.
   Only the app's styles are copied over, never its scripts.
   ponytail: browser print-to-PDF; swap for the ccpl-api document service when it exists. */

export function printElement(id: string, title: string, maxWidth = 720) {
  const el = document.getElementById(id);
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!el || !w) return;
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((s) => s.outerHTML).join("");
  w.document.write(
    `<!doctype html><html data-theme="light"><head><base href="${location.origin}/"><title>${title}</title>${styles}` +
      `<style>body{background:#fff;margin:0;padding:32px}#${id}{max-width:${maxWidth}px;margin:0 auto;box-shadow:none!important}@page{margin:14mm}</style></head><body>${el.outerHTML}</body></html>`,
  );
  w.document.close();
  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    w.focus();
    w.print();
  };
  w.onload = print;
  setTimeout(print, 800);
}

