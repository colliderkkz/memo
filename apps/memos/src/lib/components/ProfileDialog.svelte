<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import {
    Avatar,
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    Input,
  } from "@my-memos/ui";
  import { ImagePlus, Loader2, Trash2 } from "@lucide/svelte";
  import { apiResetAvatar, apiUpdateProfileName, apiUploadAvatar } from "#lib/services/profile.ts";
  import { showToast } from "#lib/state/toast.svelte.ts";

  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();

  let nameDraft = $state("");
  let busy = $state(false);
  let fileInputEl = $state<HTMLInputElement | null>(null);

  const avatarUrl = $derived(page.data.user?.image ?? null);
  const currentName = $derived(page.data.user?.name ?? "Owner");

  $effect(() => {
    if (open) nameDraft = currentName;
  });

  async function saveName() {
    const name = nameDraft.trim();
    if (!name || name === currentName || busy) return;
    busy = true;
    try {
      await apiUpdateProfileName(name);
      showToast("success", "名字已更新");
      await invalidateAll();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "更新失败");
    } finally {
      busy = false;
    }
  }

  async function uploadAvatar(file: File) {
    if (busy) return;
    busy = true;
    try {
      await apiUploadAvatar(file);
      showToast("success", "头像已更新");
      await invalidateAll();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "上传失败");
    } finally {
      busy = false;
    }
  }

  async function resetAvatar() {
    if (busy) return;
    busy = true;
    try {
      await apiResetAvatar();
      showToast("success", "头像已移除，恢复名字缩写");
      await invalidateAll();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "移除失败");
    } finally {
      busy = false;
    }
  }
</script>

<Dialog bind:open>
  <DialogContent aria-label="编辑资料" class="max-w-sm">
    <DialogHeader>
      <DialogTitle>编辑资料</DialogTitle>
      <DialogDescription class="mt-1.5">头像和名字会显示在顶栏与旧版侧栏。</DialogDescription>
    </DialogHeader>

    <div class="mt-2 flex flex-col items-center gap-3">
      <Avatar src={avatarUrl ?? undefined} fallback={nameDraft || currentName} size="xl" />

      <div class="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          class="h-7"
          disabled={busy}
          onclick={() => fileInputEl?.click()}
        >
          <ImagePlus size={13} />
          换头像
        </Button>
        {#if avatarUrl}
          <Button
            variant="ghost"
            size="sm"
            class="h-7 text-muted-foreground"
            disabled={busy}
            onclick={() => void resetAvatar()}
          >
            <Trash2 size={13} />
            移除
          </Button>
        {/if}
      </div>

      <input
        bind:this={fileInputEl}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
        class="hidden"
        onchange={(e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          if (file) void uploadAvatar(file);
          input.value = "";
        }}
      />

      <Input
        bind:value={nameDraft}
        class="w-full text-sm"
        placeholder="名字"
        maxlength={40}
        onkeydown={(e: KeyboardEvent) => {
          if (e.key === "Enter") void saveName();
        }}
      />

      <Button
        class="w-full"
        size="sm"
        disabled={busy || nameDraft.trim().length === 0 || nameDraft.trim() === currentName}
        onclick={() => void saveName()}
      >
        {#if busy}<Loader2 size={13} class="animate-spin" />{:else}保存名字{/if}
      </Button>
    </div>
  </DialogContent>
</Dialog>
