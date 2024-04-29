import { registerSW } from 'virtual:pwa-register';

registerSW({
    immediate: true,
    onRegisteredSW(swScriptUrl: any): void {
        console.log('SW registered: ', swScriptUrl)
    },
    onOfflineReady(): void {
        console.log('PWA application ready to work offline')
    }
})
