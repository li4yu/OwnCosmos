/** 自省软导航骨架，避免进页空白等到硬刷新 */
export default function ReflectLoading() {
  return (
    <div className="oc-mirror">
      <div className="oc-mirror__veil" aria-hidden />
      <aside className="oc-mirror__side">
        <header className="oc-mirror__inscribe">
          <p className="oc-mirror__eyebrow">MIRROR</p>
          <h1 className="oc-mirror__motto" lang="zh-Hans">
            以镜自省
          </h1>
        </header>
      </aside>
      <section className="oc-mirror__looking" aria-label="镜面加载中">
        <div className="oc-mirror__rim" aria-hidden />
        <div className="oc-mirror__glass">
          <p className="oc-mirror__empty">映照中…</p>
        </div>
      </section>
    </div>
  );
}
