<script lang="ts">
  export default {
    name: "SystemStatus",
    computed: {
      online(): boolean {
        // return state.online;
        return null;
      },
      status() {
        // return state.status;
        return null;
      },
      lastConnection(): string[] | null {
        // if (state.status.lastConnection) {
        //   return new Date(state.status.lastConnection)
        //     .toLocaleString()
        //     .split(" ");
        // }
        return null;
      },
    },
  };
</script>

<template>
  <article :class="online && status.online ? 'green-border' : 'red-border'">
    <TransitionGroup name="fade">
      <section v-if="online">
        <p v-if="status.online">
          Connecté
          <br />
          <span v-if="status.latency">{{ status.latency }}ms</span>
          <span v-else>Désynchronisé</span>
        </p>
        <p v-else>
          Système déconnecté
          <span v-if="lastConnection">
            <br />
            depuis le {{ lastConnection[0] }} à {{ lastConnection[1] }}
          </span>
        </p>
      </section>
      <section v-else>
        <p>Déconnecté du serveur</p>
      </section>
    </TransitionGroup>
  </article>
</template>

<style lang="scss" scoped>
  article {
    min-height: 70px;
    padding: 0.8rem 0;

    p {
      font-size: 1.24em;
      font-weight: bold;
      line-height: 1.2em;
      text-align: center;

      span {
        font-size: 0.78em;
        font-weight: normal;
      }
    }
  }

  .green-border {
    box-shadow: inset 0 0 14px green;
  }

  .red-border {
    animation: pulse 2s linear infinite alternate;
    box-shadow: inset 0 0 0 3px #d20000;

    @keyframes pulse {
      from {
        box-shadow: inset 0 0 0 3px #d20000;
      }
      to {
        box-shadow: inset 0 0 14px 3px #d20000;
      }
    }
  }
</style>
