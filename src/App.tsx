import { createStore } from 'solid-js/store';
import Editor from './components/editor';
import { createEffect, createSignal, on, onCleanup, onMount } from 'solid-js';
import { format } from 'prettier/standalone';
import prettierTSPlugin from 'prettier/plugins/typescript';
import prettierHTMLPlugin from 'prettier/plugins/html';
import prettierPostCSSPlugin from 'prettier/plugins/postcss';
import prettierESTreePlugin from 'prettier/plugins/estree';
import esbuild from 'esbuild-wasm';
import { encode as encodeMsgPack, decode as decodeMsgPack } from '@msgpack/msgpack';
import { fromUint8Array as encodeBase64, toUint8Array as decodeBase64 } from 'js-base64';
import { compress, decompress } from 'brotli-compress';
import { isDev } from 'solid-js/web';

enum CSSAdditions {
  None,
  Tailwind,
  Normalize
}

type Data = {
  html: string;
  css: string;
  js: string;
  cssAdditions: CSSAdditions;
  isTypeScript: boolean;
};

const App = () => {
  const [data, setData] = createStore<Data>({
    html: '<div>HelloWorld</div>',
    css: 'div { color: red; }',
    js: 'console.log("HelloWorld")',
    cssAdditions: CSSAdditions.Tailwind,
    isTypeScript: true
  });

  const onKeyDown = async (e: KeyboardEvent) => {
    switch (e.key) {
      case 's':
        if (e.ctrlKey) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const [html, css, js] = await Promise.all([
            format(data.html, { parser: 'html', plugins: [prettierHTMLPlugin] }),
            format(data.css, { parser: 'css', plugins: [prettierPostCSSPlugin] }),
            format(data.js, {
              parser: data.isTypeScript ? 'typescript' : 'babel',
              plugins: [prettierTSPlugin, prettierESTreePlugin]
            })
          ]);
          setData({ html, css, js });
          window.history.replaceState(
            null,
            '',
            `?${encodeBase64(await compress(encodeMsgPack(data)))}`
          );
          navigator.clipboard.writeText(location.href);
        }
    }
  };

  const [esbuildInitialized, setEsbuildInitialized] = createSignal(false);

  const [transpiledJS, setTranspiledJS] = createSignal('');

  const getTranspiledJS = async () => {
    if (!data.isTypeScript) return data.js;
    const result = await esbuild.transform(data.js, {
      loader: 'ts'
    });
    return result.code;
  };

  createEffect(
    on(
      [() => data.js, esbuildInitialized],
      () => esbuildInitialized() && getTranspiledJS().then(setTranspiledJS)
    )
  );

  onMount(async () => {
    window.addEventListener('keydown', onKeyDown);
    esbuild
      .initialize({
        wasmURL: isDev ? './node_modules/esbuild-wasm/esbuild.wasm' : './esbuild.wasm'
      })
      .then(() => setEsbuildInitialized(true));
    if (location.search)
      setData(decodeMsgPack(await decompress(decodeBase64(location.search.slice(1)))) as Data);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <main class="h-screen w-screen grid grid-rows-2 grid-cols-1">
      <div class="grid grid-cols-3">
        <Editor
          lang="html"
          value={data.html}
          onChange={s => setData('html', s)}
          options={[{ name: 'HTML', value: 'html' }]}
        />
        <Editor
          lang="css"
          value={data.css}
          onChange={s => setData('css', s)}
          options={[
            { name: 'CSS', value: CSSAdditions.None },
            { name: 'CSS + modern-normalize', value: CSSAdditions.Normalize },
            { name: 'CSS + Tailwind', value: CSSAdditions.Tailwind }
          ]}
          selectedOption={data.cssAdditions}
          onSelectChange={v => setData('cssAdditions', parseInt(v) as CSSAdditions)}
        />
        <Editor
          lang={data.isTypeScript ? 'typescript' : 'javascript'}
          value={data.js}
          onChange={s => setData('js', s)}
          options={[
            { name: 'TypeScript', value: 'ts' },
            { name: 'JavaScript', value: 'js' }
          ]}
          selectedOption={data.isTypeScript ? 'ts' : 'js'}
          onSelectChange={v => setData('isTypeScript', v === 'ts')}
        />
      </div>
      <div>
        <iframe
          sandbox="allow-scripts"
          srcdoc={`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Document</title>
    ${
      {
        [CSSAdditions.None]: '',
        [CSSAdditions.Tailwind]: '<script src="https://cdn.tailwindcss.com"></script>',
        [CSSAdditions.Normalize]: '<link rel="stylesheet" href="/modern-normalize.min.css">'
      }[data.cssAdditions]
    }
    <style>
      ${data.css}
    </style>
  </head>
  <body>
    ${data.html}
    <script>
      ${transpiledJS()}
    </script>
  </body>
</html>`}
          class="w-full h-full"
        ></iframe>
      </div>
    </main>
  );
};

export default App;
