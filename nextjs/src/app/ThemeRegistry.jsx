"use client";

import { useState } from "react";
import { CacheProvider } from "@emotion/react";
import { useServerInsertedHTML } from "next/navigation";
import createCache from "@emotion/cache";

export default function ThemeRegistry({ children }) {
    const [cache] = useState(() => {
        const emotionCache = createCache({ key: "css", prepend: true });
        emotionCache.compat = true;
        return emotionCache;
    });

    useServerInsertedHTML(() => (
        <style
            data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(" ")}`}
            dangerouslySetInnerHTML={{
                __html: Object.values(cache.inserted).join(" "),
            }}
        />
    ));

    return <CacheProvider value={cache}>{children}</CacheProvider>;
}
