<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import {
    applyTheme,
    Avatar,
    Button,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Tooltip,
  } from "@my-memos/ui";
  import { Home, Heart, Archive, Sun, Moon, Globe, UserRound, Pencil } from "@lucide/svelte";
  import { updateQuery } from "#lib/utils/index.ts";
  import ProfileDialog from "#lib/components/ProfileDialog.svelte";
  import type { MemoStats, TagCount } from "#lib/types.ts";

  interface Props {
    memoStats?: MemoStats;
    tags?: TagCount[];
    viewAsPublic?: boolean;
  }

  const THEME_KEY = "my-memos:theme";
  const NAV_ITEMS = [
    { href: "/", label: "Home", Icon: Home },
    { href: "/favorites", label: "Favorites", Icon: Heart },
    { href: "/archive", label: "Archive", Icon: Archive },
  ] as const;

  let { memoStats, tags = [], viewAsPublic = false }: Props = $props();

  let isDark = $state(false);
  let themeBtnEl = $state<HTMLButtonElement | null>(null);
  let profileOpen = $state(false);

  onMount(() => {
    const saved = localStorage.getItem(THEME_KEY);
    isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(isDark);
  });

  $effect(() => {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  });

  function toggleTheme() {
    const next = !isDark;
    applyTheme(next, themeBtnEl);
    isDark = next;
  }
</script>

<header
  class="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5 pb-4 border-b border-border mb-4"
>
  <!-- wordmark -->
  <div class="masthead-parallax flex flex-col gap-1.5 shrink-0">
    <p class="anim-fade-up font-mono text-[10px] tracking-[0.18em] uppercase text-muted-foreground">
      {new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
    </p>
    <div class="anim-fade-up anim-delay-1 flex items-baseline gap-3">
      <span
        class="font-serif font-semibold tracking-tight leading-none text-foreground relative masthead-wordmark"
      >
        my memos
        <span class="wordmark-bar absolute left-0 -bottom-1.75 h-0.75 w-13 rounded-sm bg-accent"
        ></span>
      </span>
      {#if memoStats && memoStats.total > 0}
        <span class="font-mono text-xs text-muted-foreground pt-0.5 hidden lg:inline">
          <strong class="text-foreground font-semibold">{memoStats.total}</strong> entries
          {#if memoStats.today > 0}
            &nbsp;·&nbsp;<strong class="text-foreground font-semibold">{memoStats.today}</strong> today
          {/if}
        </span>
      {/if}
    </div>
  </div>

  <div class="flex items-center justify-between gap-2 lg:flex-1 lg:justify-end lg:gap-4">
    <!-- nav -->
    <nav class="anim-fade-up anim-delay-2 flex gap-1 lg:pr-3 lg:mr-1 lg:border-r lg:border-border">
      {#each NAV_ITEMS as { href, label, Icon } (href)}
        {@const active = page.url.pathname === href}
        <button
          type="button"
          onclick={() => goto(href)}
          class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors
            {active
            ? 'text-accent bg-accent/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
        >
          <Icon size={13} />
          <span class="hidden lg:inline">{label}</span>
        </button>
      {/each}
    </nav>

    <!-- theme + avatar -->
    <div class="anim-fade-up anim-delay-3 flex items-center gap-2 shrink-0">
      <Tooltip content={viewAsPublic ? "View as private" : "View as public"} side="top">
        <button
          type="button"
          onclick={() => updateQuery({ view: viewAsPublic ? null : "public" })}
          class="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-pressed={viewAsPublic}
          aria-label={viewAsPublic ? "View as private" : "View as public"}
        >
          {#if viewAsPublic}<UserRound size={15} />{:else}<Globe size={15} />{/if}
        </button>
      </Tooltip>

      <!-- theme -->
      <Tooltip content={isDark ? "Light mode" : "Dark mode"} side="top">
        <button
          type="button"
          bind:this={themeBtnEl}
          onclick={toggleTheme}
          class="flex items-center justify-center h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {#if isDark}<Sun size={15} />{:else}<Moon size={15} />{/if}
        </button>
      </Tooltip>

      <!-- avatar -->
      <Popover>
        <PopoverTrigger
          class="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent shrink-0"
        >
          <Avatar
            src={page.data.user?.image ?? undefined}
            fallback={page.data.user?.name ?? "Owner"}
            size="sm"
          />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" class="w-52">
          <div class="flex flex-col items-center gap-3 py-1">
            <Avatar
              src={page.data.user?.image ?? undefined}
              fallback={page.data.user?.name ?? "Owner"}
              size="lg"
            />
            <div class="text-center">
              <p class="text-sm font-medium">{page.data.user?.name}</p>
              <p class="text-xs text-muted-foreground truncate max-w-44">
                {page.data.user?.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="h-7 w-full"
              onclick={() => (profileOpen = true)}
            >
              <Pencil size={13} />
              编辑资料
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</header>

<ProfileDialog bind:open={profileOpen} />

<style>
  .masthead-wordmark {
    font-size: 36px;
    transition:
      color 0.3s ease,
      letter-spacing 0.3s ease;
  }

  .masthead-wordmark:hover {
    color: var(--color-accent);
    letter-spacing: 0.02em;
  }

  .wordmark-bar {
    transform-origin: left center;
    animation: memos-bar-grow 0.7s 0.3s cubic-bezier(0.22, 1, 0.36, 1) backwards;
    transition:
      filter 0.3s ease,
      box-shadow 0.3s ease;
  }

  .masthead-wordmark:hover .wordmark-bar {
    filter: brightness(1.2) saturate(1.25);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-accent) 55%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    .wordmark-bar {
      animation: none;
    }
  }

  @media (max-width: 639px) {
    .masthead-wordmark {
      font-size: 26px;
    }
  }
</style>
