import { createEffect, onCleanup, onMount, Show, For } from 'solid-js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type Option<T> = {
  name: string;
  value: T;
};

const Editor = function <T extends string | number>(props: {
  lang: string;
  value: string;
  onChange: (value: string) => void;
  onSelectChange?: (value: string) => void;
  options: Option<T>[];
  selectedOption?: T;
}) {
  let editorContainer: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor;

  onMount(() => {
    editor = monaco.editor.create(editorContainer, {
      value: props.value,
      language: props.lang,
      theme: 'vs-dark',
      minimap: {
        enabled: false
      },
      linkedEditing: true,
      tabSize: 2,
      insertSpaces: true,
      fontLigatures: true
    });
    editor.onDidChangeModelContent(_ => props.onChange(editor.getValue()));
  });

  const onResize = () => editor?.layout();

  onMount(() => window.addEventListener('resize', onResize));
  onCleanup(() => window.removeEventListener('resize', onResize));

  createEffect(() => {
    if (editor.getValue() === props.value) return;
    editor?.setValue(props.value);
  });

  onCleanup(() => editor?.dispose());

  return (
    <div class="h-full overflow-hidden">
      <Show when={props.options.length > 1} fallback={<div>{props.options[0].name}</div>}>
        <select class="w-full" onChange={e => props.onSelectChange?.(e.target.value.toString())}>
          <For each={props.options}>
            {option => (
              <option selected={option.value === props.selectedOption} value={option.value}>
                {option.name}
              </option>
            )}
          </For>
        </select>
      </Show>
      <div class="h-full" ref={editorContainer!}></div>
    </div>
  );
};

export default Editor;
