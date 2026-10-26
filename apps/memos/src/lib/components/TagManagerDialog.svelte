<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Input,
  } from "@my-memos/ui";
  import { Check, Loader2, Pencil, Tags, Trash2, X } from "@lucide/svelte";
  import { apiDeleteTag, apiRenameTag } from "#lib/services/tags.ts";
  import { showToast } from "#lib/state/toast.svelte.ts";
  import type { TagCount } from "#lib/types.ts";

  interface Props {
    open?: boolean;
    tags: TagCount[];
  }

  let { open = $bindable(false), tags }: Props = $props();

  let editing = $state<string | null>(null);
  let draft = $state("");
  let confirmingDelete = $state<string | null>(null);
  let busy = $state(false);

  function startRename(name: string) {
    editing = name;
    draft = name;
    confirmingDelete = null;
  }

  async function commitRename(from: string) {
    const to = draft.trim().toLowerCase();
    if (!to || to === from || busy) {
      editing = null;
      return;
    }
    busy = true;
    try {
      const { updated } = await apiRenameTag(from, to);
      showToast("success", "标签已重命名", `#${from} → #${to}，更新了 ${updated} 条备忘录`);
      editing = null;
      await invalidateAll();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "重命名失败");
    } finally {
      busy = false;
    }
  }

  async function commitDelete(name: string) {
    if (busy) return;
    busy = true;
    try {
      const { updated } = await apiDeleteTag(name);
      showToast("success", "标签已删除", `已从 ${updated} 条备忘录中移除 #${name}`);
      confirmingDelete = null;
      await invalidateAll();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "删除失败");
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open>
  <DialogContent aria-label="标签管理" class="max-w-md">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        <Tags size={16} class="text-accent" />
        标签管理
      </DialogTitle>
      <DialogDescription class="mt-1.5">
        重命名或删除会同步更新所有相关备忘录正文里的 #话题 文字。
      </DialogDescription>
    </DialogHeader>

    <div class="-mx-1 mt-2 max-h-80 space-y-1 overflow-y-auto px-1">
      {#if tags.length === 0}
        <p class="py-8 text-center text-sm text-muted-foreground">
          还没有标签——在备忘录里写 #标签名 即可创建
        </p>
      {/if}
      {#each tags as { name, count } (name)}
        <div class="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5">
          {#if editing === name}
            <Input
              bind:value={draft}
              class="h-7 flex-1 text-sm"
              placeholder="新标签名"
              onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Enter") void commitRename(name);
                if (e.key === "Escape") editing = null;
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0"
              disabled={busy}
              onclick={() => void commitRename(name)}
              aria-label="确认重命名"
            >
              {#if busy}<Loader2 size={13} class="animate-spin" />{:else}<Check size={13} />{/if}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0"
              disabled={busy}
              onclick={() => (editing = null)}
              aria-label="取消"
            >
              <X size={13} />
            </Button>
          {:else if confirmingDelete === name}
            <span class="flex-1 text-sm">
              删除 <strong>#{name}</strong>？将从 {count} 条备忘录中移除
            </span>
            <Button
              variant="destructive"
              size="sm"
              class="h-7 shrink-0"
              disabled={busy}
              onclick={() => void commitDelete(name)}
            >
              {#if busy}<Loader2 size={13} class="animate-spin" />{:else}删除{/if}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 shrink-0"
              disabled={busy}
              onclick={() => (confirmingDelete = null)}
            >
              取消
            </Button>
          {:else}
            <span class="flex-1 truncate text-sm">#{name}</span>
            <span class="font-mono text-xs text-muted-foreground">{count}</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0 text-muted-foreground"
              onclick={() => startRename(name)}
              aria-label="重命名标签"
            >
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 shrink-0 text-muted-foreground hover:text-error"
              onclick={() => {
                confirmingDelete = name;
                editing = null;
              }}
              aria-label="删除标签"
            >
              <Trash2 size={13} />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  </DialogContent>
</Dialog>
