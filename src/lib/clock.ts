import { ref } from "vue"

/*
 * One shared one-second tick for everything that shows an age ("il y a 3 s")
 * or a staleness, instead of a timer per component.
 */
export const now = ref(Date.now())

let started = false

export function startClock(): void {
    if (started) return
    started = true
    setInterval(() => (now.value = Date.now()), 1000)
}
