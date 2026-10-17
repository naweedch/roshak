import ReactMarkdown from "react-markdown";

/**
 * نمایش امن محتوای مارک‌داون (مقاله‌ها و صفحات). HTML خام پذیرفته نمی‌شود و
 * پیوندهای خارجی با rel امن باز می‌شوند.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-roshnak">
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children: c }) => {
            const external = href ? /^https?:\/\//.test(href) : false;
            return (
              <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
                {c}
              </a>
            );
          },
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
