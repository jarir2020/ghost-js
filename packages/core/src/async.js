import { signal, batch } from './signals.js';

export function asyncSignal(fetcher) {
    const data = signal(null);
    const loading = signal(true);
    const error = signal(null);

    async function execute() {
        batch(() => {
            loading.set(true);
            error.set(null);
        });

        try {
            const result = await fetcher();
            batch(() => {
                data.set(result);
                loading.set(false);
            });
        } catch (err) {
            batch(() => {
                error.set(err);
                loading.set(false);
            });
        }
    }

    // Initial execution
    execute();

    return {
        get data() { return data.get(); },
        get loading() { return loading.get(); },
        get error() { return error.get(); },
        refetch: execute
    };
}
