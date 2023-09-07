<script lang="ts">
  export default {
    name: "StreamSettings",
    data() {
      return {
        video: "gopro",
        audio: "gopro",
      };
    },
  };
</script>

<template>
  <article>
    <form @submit.prevent>
      <section>
        <label for="video">Vidéo :</label>
        <select id="video" v-model="video" name="video">
          <option value="gopro">GoPro</option>
          <option value="webcam">Webcam</option>
        </select>
      </section>
      <section>
        <label for="audio">Audio :</label>
        <select id="audio" v-model="audio" name="audio">
          <option value="gopro">GoPro</option>
          <option value="pilotes">Pilotes</option>
        </select>
      </section>
    </form>
  </article>
</template>

<style lang="scss" scoped>
  article {
    padding: 0.4rem;

    form {
      display: grid;
      gap: 0.6rem;
      grid-template-columns: repeat(2, 1fr);
      width: 100%;

      section {
        display: flex;
        flex-flow: column nowrap;

        label {
          font-size: 0.9em;
          line-height: 1em;
          margin: 0 0 0.2rem 0.2rem;
        }

        select {
          background-color: white;
          border-radius: 4px;
          color: #242424;
          outline: none;
          padding: 0.3rem;
        }
      }
    }
  }
</style>
