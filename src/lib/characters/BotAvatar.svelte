<script lang="ts">
  interface Props {
    avatar: string;
    size?: number;
    animation?: 'idle' | 'thinking' | 'bounce' | 'shake' | 'jump' | 'tilt' | 'celebrate' | 'droop';
  }

  let { avatar, size = 64, animation = 'idle' }: Props = $props();
</script>

<img
  src={avatar}
  alt="Bot character"
  width={size}
  height={size}
  class={['bot-avatar', `anim-${animation}`]}
/>

<style>
  .bot-avatar {
    display: block;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .anim-idle {
    animation: bob 2s ease-in-out infinite;
  }

  .anim-thinking {
    animation: rock 0.6s ease-in-out infinite;
  }

  .anim-bounce {
    animation: bounce 0.4s ease-out;
  }

  .anim-shake {
    animation: shake 0.4s ease-out;
  }

  .anim-jump {
    animation: jump 0.5s ease-out;
  }

  .anim-tilt {
    animation: tilt 0.3s ease-out;
  }

  .anim-celebrate {
    animation: celebrate 0.5s ease-out 3;
  }

  .anim-droop {
    animation: droop 0.5s ease-out forwards;
  }

  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes rock {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    75% { transform: rotate(5deg); }
  }

  @keyframes bounce {
    0% { transform: scale(1); }
    40% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-3px); }
    80% { transform: translateX(2px); }
  }

  @keyframes jump {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-10px) scale(1.1); }
    100% { transform: translateY(0) scale(1); }
  }

  @keyframes tilt {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(6deg); }
  }

  @keyframes celebrate {
    0% { transform: translateY(0) scale(1); }
    30% { transform: translateY(-8px) scale(1.12); }
    100% { transform: translateY(0) scale(1); }
  }

  @keyframes droop {
    0% { transform: translateY(0); opacity: 1; }
    100% { transform: translateY(6px); opacity: 0.7; }
  }
</style>
