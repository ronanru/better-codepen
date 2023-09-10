import { editor as Monaco } from 'monaco-editor/esm/vs/editor/editor.api';
import { For, Show, createEffect, onCleanup, onMount } from 'solid-js';

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
  height: number;
  width: number;
}) {
  let editorContainer: HTMLDivElement;
  let editor: Monaco.IStandaloneCodeEditor;

  onMount(() => {
    editor = Monaco.create(editorContainer, {
      value: props.value,
      language: props.lang,
      theme: 'vs-dark',
      minimap: {
        enabled: false,
      },
      linkedEditing: true,
      tabSize: 2,
      insertSpaces: true,
      fontLigatures: true,
      folding: false,
      glyphMargin: false,
      bracketPairColorization: {
        enabled: true,
      },
      dimension: {
        height: props.height,
        width: props.width,
      },
      wordWrap: 'on',
      showFoldingControls: 'never',
      matchBrackets: 'always',
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      lineNumbersMinChars: 2,
    });
    editor.onDidChangeModelContent((_) => props.onChange(editor.getValue()));
  });

  createEffect(() => {
    editor?.layout({
      height: props.height,
      width: props.width,
    });
    if (editor.getValue() !== props.value) editor?.setValue(props.value);
  });

  onCleanup(() => editor?.dispose());

  return (
    <div class="flex-1">
      <Show
        when={props.options.length > 1}
        fallback={<div>{props.options[0].name}</div>}
      >
        <select
          class="w-full"
          onChange={(e) => props.onSelectChange?.(e.target.value.toString())}
        >
          <For each={props.options}>
            {(option) => (
              <option
                selected={option.value === props.selectedOption}
                value={option.value}
              >
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
