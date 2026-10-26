<script lang="ts">
  import { tick } from "svelte";
  import { cn } from "@my-memos/ui";
  import { ImagePlus, Loader2 } from "@lucide/svelte";
  import { apiUploadImage } from "#lib/services/uploads.ts";
  import { showToast } from "#lib/state/toast.svelte.ts";

  interface Props {
    value?: string;
    placeholder?: string;
    class?: string;
    onkeydown?: (e: KeyboardEvent) => void;
    ontextchange?: (value: string) => void;
    onblur?: () => void;
    editorElement?: HTMLTextAreaElement | null;
  }

  let {
    value = $bindable(""),
    placeholder = "",
    class: extraClass = "",
    onkeydown,
    ontextchange,
    onblur,
    editorElement = $bindable(null),
  }: Props = $props();

  let fileInputEl = $state<HTMLInputElement | null>(null);
  let uploading = $state(false);

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    ontextchange?.(target.value);
  }

  function handleKeydown(e: KeyboardEvent) {
    onkeydown?.(e);
  }

  function insertAtCursor(text: string) {
    const el = editorElement;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    value = value.slice(0, start) + text + value.slice(end);
    ontextchange?.(value);
    void tick().then(() => {
      if (!el) return;
      const pos = start + text.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  async function uploadFiles(files: FileList | File[]) {
    if (uploading) return;
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) return;

    uploading = true;
    try {
      for (const file of images) {
        const url = await apiUploadImage(file);
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "");
        insertAtCursor(`![${alt}](${url})\n`);
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "图片上传失败");
    } finally {
      uploading = false;
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const files = e.clipboardData?.files;
    if (files && Array.from(files).some((file) => file.type.startsWith("image/"))) {
      e.preventDefault();
      void uploadFiles(files);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (files?.length) void uploadFiles(files);
  }
</script>

<div class="relative">
  <textarea
    bind:value
    bind:this={editorElement}
    {placeholder}
    oninput={handleInput}
    onkeydown={handleKeydown}
    onpaste={handlePaste}
    ondragover={(e) => e.preventDefault()}
    ondrop={handleDrop}
    {onblur}
    class={cn("md-editor", extraClass)}></textarea>

  <button
    type="button"
    title="上传图片（也可直接粘贴截图或拖入图片文件）"
    aria-label="上传图片"
    disabled={uploading}
    onclick={() => fileInputEl?.click()}
    class="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded
      text-muted-foreground bg-background/70 opacity-70 transition-all
      hover:opacity-100 hover:text-foreground hover:bg-muted active:scale-90
      disabled:opacity-100 disabled:cursor-wait"
  >
    {#if uploading}
      <Loader2 size={15} class="animate-spin" />
    {:else}
      <ImagePlus size={15} />
    {/if}
  </button>

  <input
    bind:this={fileInputEl}
    type="file"
    accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
    multiple
    class="hidden"
    onchange={(e) => {
      const input = e.currentTarget;
      if (input.files?.length) void uploadFiles(input.files);
      input.value = "";
    }}
  />
</div>
