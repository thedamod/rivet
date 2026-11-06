import React, { useMemo, useState, useRef, useEffect } from "react";
import { View, Linking } from "react-native";
import { WebView } from "react-native-webview";
import { viewerScript, sansFont, monoFont } from "./generated/viewer";
export function PierreViewer({
  kind = "code",
  name = "",
  contents = "",
  files,
  theme,
  onOpen,
  baseUrl,
  imageMap,
  selection,
}: {
  kind?: "code" | "diff" | "tree" | "markdown";
  name?: string;
  contents?: string;
  files?: { name: string; path: string; type: string }[];
  theme: "dark" | "light";
  onOpen?: (path: string) => void;
  baseUrl?: string;
  imageMap?: Record<string, string>;
  selection?: string;
}) {
  const web = useRef<React.ComponentRef<typeof WebView>>(null);
  useEffect(() => {
    if (kind === "tree" && selection === "")
      web.current?.injectJavaScript("window.clearTreeSelection?.();true;");
  }, [kind, selection]);
  const [height, setHeight] = useState(180);
  const html = useMemo(() => {
    const data = JSON.stringify({
      kind,
      name,
      contents,
      files,
      theme,
      baseUrl,
      imageMap,
    }).replaceAll("<", "\\u003c");
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data: https:;"><style>@font-face{font-family:Geist;src:url(data:font/woff2;base64,${sansFont})}@font-face{font-family:'Geist Mono';src:url(data:font/woff2;base64,${monoFont})}*{box-sizing:border-box}html,body{margin:0;background:${theme === "dark" ? "#0a0a0a" : "#fcfcfc"};color:${theme === "dark" ? "#f5f5f5" : "#27272a"};font-family:Geist}#root{min-height:100px}diffs-container{--diffs-font-family:'Geist Mono';--diffs-header-font-family:Geist;--diffs-font-size:12px;--diffs-line-height:22px}file-tree-container{--trees-font-family:Geist}.markdown{padding:0 1px;font-family:Geist;font-size:16px;line-height:23px;overflow-wrap:anywhere}.markdown p{margin:10px 0}.markdown h1{font-size:21px;line-height:28px}.markdown h2{font-size:19px;line-height:26px}.markdown pre,.markdown code{font-family:'Geist Mono';font-size:13px}.markdown pre{overflow:auto;padding:10px;background:${theme === "dark" ? "#111" : "#fff"}}.markdown table{width:100%;table-layout:fixed;border-collapse:collapse}.markdown th,.markdown td{text-align:left;vertical-align:top;font-size:11px;border-bottom:1px solid ${theme === "dark" ? "#191919" : "#e4e4e7"};padding:7px 4px}.markdown img{display:block;max-width:100%;height:auto;object-fit:contain}.markdown img[width="16"],.markdown img[height="16"],.markdown img[width="20"],.markdown img[height="20"]{display:inline-block;vertical-align:middle;margin:0 3px;width:auto;max-height:20px}.markdown a{color:inherit}.markdown blockquote{border-left:2px solid #818181;padding-left:12px;margin-left:0}</style></head><body><div id="root"></div><script>window.viewerData=${data};${viewerScript.replaceAll("</script", "<\\/script")}</script></body></html>`;
  }, [kind, name, contents, files, theme, baseUrl, imageMap]);
  const source = useMemo(() => ({ html }), [html]);
  return (
    <View style={{ height: Math.min(height, 2400), width: "100%" }}>
      <WebView
        ref={web}
        originWhitelist={["about:blank"]}
        source={source}
        javaScriptEnabled
        scrollEnabled={height > 2400}
        style={{ backgroundColor: "transparent" }}
        onShouldStartLoadWithRequest={(r) => r.url === "about:blank"}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "height" && Number.isFinite(data.height))
              setHeight(data.height);
            if (
              data.type === "link" &&
              typeof data.url === "string" &&
              /^https:\/\//.test(data.url)
            )
              Linking.openURL(data.url);
            if (data.type === "open" && typeof data.path === "string")
              onOpen?.(data.path);
          } catch {}
        }}
      />
    </View>
  );
}
