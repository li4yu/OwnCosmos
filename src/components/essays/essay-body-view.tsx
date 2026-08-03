import { BODY_FORMAT_HTML } from "@/db/schema";
import { sanitizeEssayHtml, stripToPlainText } from "@/lib/rich-text";

type EssayBodyViewProps = {
  body: string;
  bodyFormat?: string | null;
  className?: string;
  empty?: string;
};

/** 馆藏 / 只读展示：html 用净化后的富文本；plain 保留换行 */
export function EssayBodyView({
  body,
  bodyFormat,
  className,
  empty = "（无正文）",
}: EssayBodyViewProps) {
  if (bodyFormat === BODY_FORMAT_HTML) {
    const html = sanitizeEssayHtml(body);
    if (!stripToPlainText(html) && !html.includes("<img")) {
      return <p className={className}>{empty}</p>;
    }
    return (
      <div
        className={`oc-essay-prose ${className ?? ""}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  const plain = body.trim();
  return (
    <p className={`whitespace-pre-wrap ${className ?? ""}`}>
      {plain || empty}
    </p>
  );
}
