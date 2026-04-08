<script lang="ts">
  import BotAvatar from './BotAvatar.svelte';
  import SpeechBubble from './SpeechBubble.svelte';
  import type { BotCharacter } from './bots';

  type AnimationType = 'idle' | 'thinking' | 'bounce' | 'shake' | 'jump' | 'tilt' | 'celebrate' | 'droop';

  interface Props {
    character: BotCharacter;
    reaction: string;
    animation?: AnimationType;
  }

  let { character, reaction, animation = 'idle' }: Props = $props();
</script>

<div class="bot-panel">
  <BotAvatar avatar={character.avatar} size={80} {animation} />
  <div class="bot-info">
    <span class="bot-name" style:color={character.color}>{character.name}</span>
    {#if reaction}
      <SpeechBubble text={reaction} color={character.color} />
    {/if}
  </div>
</div>

<style>
  .bot-panel {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;
  }

  .bot-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .bot-name {
    font-weight: 700;
    font-size: 1rem;
  }
</style>
