import Link from "next/link";

export type GuideArticleProps = {
  /** guest = 访客页顶栏；app = 已在应用壳内，无独立顶栏 */
  mode: "guest" | "app";
  /** guest 模式下，已登录则显示「返回应用」而非登录/注册 */
  loggedIn?: boolean;
};

export function GuideArticle({ mode, loggedIn = false }: GuideArticleProps) {
  const showGuestChrome = mode === "guest";

  return (
    <div
      className={
        showGuestChrome
          ? "guide-page guide-page--guest"
          : "guide-page guide-page--embedded"
      }
    >
      {showGuestChrome ? (
        <header className="guide-page__topbar">
          <Link href={loggedIn ? "/app" : "/"} className="guide-page__brand">
            <span>自宇</span>My Own Cosmos
          </Link>
          <div className="guide-page__actions">
            {loggedIn ? (
              <Link href="/app" className="guest-landing__chip guest-landing__chip--accent">
                返回应用
              </Link>
            ) : (
              <>
                <Link href="/?auth=login" className="guest-landing__chip">
                  登录
                </Link>
                <Link
                  href="/?auth=register"
                  className="guest-landing__chip guest-landing__chip--accent"
                >
                  开启
                </Link>
              </>
            )}
          </div>
        </header>
      ) : null}

      <div className="guide-page__main">
        {showGuestChrome ? (
          <>
            <p className="guide-page__eyebrow">USER GUIDE · 使用说明</p>
            <h1>如何走进并使用自宇</h1>
          </>
        ) : null}
        <p className="guide-page__lede">
          自宇（My Own Cosmos）是一座只属于你的精神宇宙。它不是普通的待办或笔记文件夹，而是以<strong>时序成长</strong>为轴：思绪、规划与专注会随时间流动、定型、沉淀，并可在自省与伴读中回望。
        </p>
        <p className="guide-page__lede guide-page__lede--soft">
          本文对应<strong>现行产品</strong>（V1 时序闭环 + 伴读 / 自省 / 润色 / 知识库）。界面雅名可悬停查看一句提示；拿不准时回到本页对照即可。
        </p>

        <nav className="guide-page__toc" aria-label="目录">
          <a href="#what">它是什么</a>
          <a href="#diff">与普通工具的差别</a>
          <a href="#map">时序地图</a>
          <a href="#account">账号与设置</a>
          <a href="#home">首页</a>
          <a href="#present">今时际</a>
          <a href="#future">来日途</a>
          <a href="#focus">凝时</a>
          <a href="#past">昔时往</a>
          <a href="#reflect">自省</a>
          <a href="#companion">伴读</a>
          <a href="#loops">主链路详解</a>
          <a href="#walkthrough">推荐走通一遍</a>
          <a href="#rules">硬规则</a>
          <a href="#names">雅名词典</a>
          <a href="#later">现行与后置</a>
        </nav>

        <section id="what" className="guide-page__section">
          <h2>它是什么</h2>
          <p>
            每个人都拥有一座只属于自己的精神宇宙。世俗工具往往「功能优先」；自宇以<strong>人的时序成长</strong>为核心——思绪、灵感、计划、回忆会随着时间流动、定型、沉淀。
          </p>
          <p>时间维度与专注、自省：</p>
          <ul className="guide-page__rules">
            <li>
              <strong>昔时往</strong>：所有已成过往的记忆与经历（沉淀态）
            </li>
            <li>
              <strong>自省</strong>：对着过往，看清此刻的自己（镜面）
            </li>
            <li>
              <strong>今时际</strong>：当下正在发生、流动、思考的自我（流动态）
            </li>
            <li>
              <strong>来日途</strong>：未来期待、目标、可期的前路（待发生态）
            </li>
            <li>
              <strong>凝时</strong>：把心神收在一段光阴里，留下可计量的专注记录（凝神态）
            </li>
          </ul>
          <p>
            产品目标可以写成一句：在专属私人宇宙中<strong>留存过往、安住当下、奔赴未来</strong>，并以专注与自省把光阴凝成可回望的轨迹。
          </p>
        </section>

        <section id="diff" className="guide-page__section">
          <h2>与普通工具的差别</h2>
          <p>
            备忘录、日记、待办往往把内容放进静态文件夹；自宇里的数据带着<strong>生命周期与自动流转规则</strong>：
          </p>
          <ul className="guide-page__rules">
            <li>当下写的每日随笔，久未触碰会<strong>自动归档</strong>进过往，不让「现在」被旧稿堆满。</li>
            <li>未来的计划到达提醒窗口，会以<strong>临期提醒</strong>映到当下；完成后再沉入过往。</li>
            <li>专注结束留下<strong>专注记录</strong>，同样进入馆藏，而不是只剩一个计时数字。</li>
            <li>过往<strong>不倒流</strong>成可编辑草稿——可以回望、引用，但时序单向沉淀。</li>
            <li>
              馆藏可<strong>进知识库</strong>，供伴读回想；与「归档进馆藏」不是同一件事。
            </li>
          </ul>
          <div className="guide-page__callout">
            <p>
              成长闭环：
              <em>
                当下思考 → 未来规划 → 专注落地 → 过往沉淀 → 自省回望 → 再启新生思考
              </em>
            </p>
          </div>
        </section>

        <section id="map" className="guide-page__section">
          <h2>时序地图（登录后怎么走）</h2>
          <p>
            顶栏顺序：
            <strong>首页 → 昔时往 → 自省 → 今时际 → 来日途 → 凝时</strong>
            。品牌「自宇」是标识，回首页请点「首页」。
          </p>
          <ul className="guide-page__rules">
            <li>
              <strong>昔时往</strong>：馆藏、时间线、情绪复盘。
            </li>
            <li>
              <strong>自省</strong>：对镜 / 照时 / 对照 / 留痕（单页镜台）。
            </li>
            <li>
              <strong>今时际</strong>：随笔（每日 / 专题）、临期提醒。
            </li>
            <li>
              <strong>来日途</strong>：规划、周期计划、时间胶囊、每日打卡。
            </li>
            <li>
              <strong>凝时</strong>：正向计时、倒计时、专注记录。
            </li>
          </ul>
          <p>右下角还有<strong>伴读桌宠</strong>（可拖动；左键开窗，右键动作）。</p>
        </section>

        <section id="account" className="guide-page__section">
          <h2>账号与设置</h2>
          <h3>注册 / 登录 / 退出</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>注册</strong>
              <span>
                在首页点「开启」或「注册」：填写邮箱与密码后，在<strong>同一页</strong>点「发送验证码」，填入 6 位码后「验证并注册」。
              </span>
            </li>
            <li>
              <strong>登录</strong>
              <span>
                已有账号点「登录」。未登录时不能进入业务数据页。忘记密码：邮箱收验证码后设置新密码。
              </span>
            </li>
            <li>
              <strong>设置 · 账号与安全</strong>
              <span>
                可修改密码；可注销账号（需确认密码，硬删全部个人数据，不可恢复）。
              </span>
            </li>
            <li>
              <strong>退出</strong>
              <span>在设置或头像菜单退出登录。</span>
            </li>
          </ol>

          <h3>个人资料与外观</h3>
          <p>
            可修改昵称、简介并上传头像。主题在「设置 → 外观」切换，写入账号：
            <strong>深空夜色</strong>、<strong>时光卡其</strong>、<strong>墨白</strong>、<strong>素曜</strong>
            。登录后不以各业务顶栏为主入口换肤。
          </p>

          <h3>偏好</h3>
          <p>
            可配置每日随笔<strong>自动归档</strong>空闲小时数（默认约 48
            小时；每次编辑重置计时）、桌面通知与往年今日、凝时勿扰与倒计时默认时长。
          </p>

          <h3>伴读设置</h3>
          <p>
            「设置 → 伴读」可上传定制形象、设置称呼与语气、勿扰与主动气泡上限。
            改完请点<strong>保存设置</strong>，轻语与对话框会同步人格。
          </p>

          <h3>导出</h3>
          <p>
            可导出未归档随笔与进行中规划（文本），以及近七日动态与沉淀一览（SVG / JSON / CSV）。
          </p>
        </section>

        <section id="home" className="guide-page__section">
          <h2>首页</h2>
          <p>登录后的首页用于「一眼看见今天」并快速进入模块：</p>
          <ul className="guide-page__rules">
            <li>
              <strong>问候与快捷动作</strong>：写随笔、新建计划、每日打卡、开正向计时等。
            </li>
            <li>
              <strong>今日摘要</strong>：临期数、流动随笔数、今日专注、打卡进度（只读聚合）。
            </li>
            <li>
              <strong>临期提醒与今日打卡</strong>：左侧临期卡片；右侧每日 / 周期打卡。
            </li>
            <li>
              <strong>近七日动态</strong>：打卡与凝时脉搏。
            </li>
            <li>
              <strong>时序入口</strong>：昔时往 → 自省 → 今时际 → 来日途 → 凝时。
            </li>
          </ul>
        </section>

        <section id="present" className="guide-page__section">
          <h2>今时际 · 怎么用</h2>
          <p>
            今时际是<strong>当下工作台</strong>：捕捉瞬时思绪，并承接来自未来的提醒。
          </p>

          <h3>随笔（每日随笔 / 专题随笔）</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>每日随笔</strong>
              <span>
                进入今时际 → 随笔 → 每日随笔 → 新建。支持富文本、表情与插图；手动保存。离开未保存时有确认。
              </span>
            </li>
            <li>
              <strong>润色</strong>
              <span>
                AI 启用时，可对选区或全文润色，采纳后写回正文。
              </span>
            </li>
            <li>
              <strong>专题随笔</strong>
              <span>
                先建专题夹，再往夹里写多篇。专题篇<strong>不会</strong>自动归档，也<strong>不能</strong>单篇归档，须「归档专题」。
              </span>
            </li>
            <li>
              <strong>手动 / 自动归档（每日随笔）</strong>
              <span>
                可手动归档；空闲达标后也会自动归档进馆藏「随笔归档」。专题不参与自动逾时。
              </span>
            </li>
          </ol>

          <h3>临期提醒</h3>
          <ul className="guide-page__rules">
            <li>卡片是来日途计划的<strong>只读倒影</strong>，不要在卡片上改计划正文。</li>
            <li>「完成」回写本体并归档；可延期或写随想（生成带溯源的随笔）。</li>
          </ul>
        </section>

        <section id="future" className="guide-page__section">
          <h2>来日途 · 怎么用</h2>
          <p>来日途是<strong>远期规划仓库</strong>：计划本体住在这里。</p>
          <ol className="guide-page__steps">
            <li>
              <strong>规划</strong>
              <span>单次或愿景：截止日期与提前提醒；可从随笔「提炼」并溯源。</span>
            </li>
            <li>
              <strong>周期计划</strong>
              <span>日 / 周 / 月 / 年 / 自定义；当期结束计次并滚下一期；可挂子任务。</span>
            </li>
            <li>
              <strong>每日打卡</strong>
              <span>每日习惯打卡，可写心得；完成记录会进馆藏。</span>
            </li>
            <li>
              <strong>时间胶囊</strong>
              <span>指定日期解锁；未到期不可读全文。</span>
            </li>
          </ol>
        </section>

        <section id="focus" className="guide-page__section">
          <h2>凝时 · 怎么用</h2>
          <ol className="guide-page__steps">
            <li>
              <strong>正向计时 / 倒计时</strong>
              <span>
                可选绑定规划或每日打卡。倒计时默认时长与勿扰在设置中改。
              </span>
            </li>
            <li>
              <strong>专注中写随笔</strong>
              <span>可唤起随笔弹窗，计时不中断；随笔可溯源到本次会话。</span>
            </li>
            <li>
              <strong>结束并写心得</strong>
              <span>生成专注记录并自动进馆藏。</span>
            </li>
          </ol>
        </section>

        <section id="past" className="guide-page__section">
          <h2>昔时往 · 怎么用</h2>
          <p>
            昔时往是<strong>永久记忆馆藏</strong>：已成定局、可回顾，不逆向回流。
          </p>
          <h3>馆藏</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>浏览与操作</strong>
              <span>
                按类型分区；可进知识库 / 移出知识库、删除归档、上传记忆碎片（图片默认不进知识库）。
              </span>
            </li>
            <li>
              <strong>进知识库</strong>
              <span>
                把文本纳入伴读可检索的个人语料（纯图无字不可进）。归档浏览 ≠ 进知识库。
              </span>
            </li>
            <li>
              <strong>引用新建</strong>
              <span>可复制为新随笔或新计划；禁止把归档原文迁回可编辑本体。</span>
            </li>
          </ol>
          <h3>时间线与情绪复盘</h3>
          <p>
            时间线提供年月密度与往年今日；情绪复盘有情绪分布、年度摘要与情绪共现（规则统计）。
          </p>
        </section>

        <section id="reflect" className="guide-page__section">
          <h2>自省 · 怎么用</h2>
          <p>顶栏「自省」为镜台（需启用 AI）：</p>
          <ul className="guide-page__rules">
            <li>
              <strong>对镜</strong>：与缩影对话，可引用已进知识库的馆藏。
            </li>
            <li>
              <strong>照时</strong>：回看一段日子，生成时段报告。
            </li>
            <li>
              <strong>对照</strong>：昔时馆藏与此刻自述对照。
            </li>
            <li>
              <strong>留痕</strong>：已写下的报告；可归档进馆藏。
            </li>
          </ul>
        </section>

        <section id="companion" className="guide-page__section">
          <h2>伴读桌宠 · 怎么用</h2>
          <ul className="guide-page__rules">
            <li>左键开聊天窗，右键选动作，可拖动位置。</li>
            <li>可问产品用法、过往回想、临期与打卡、闲聊等。</li>
            <li>主动轻语受勿扰、日上限、静默时段约束；人格请在设置中保存后同步。</li>
            <li>窗内可管理会话历史；未启用 AI 时桌宠能力不可用，时序主链路仍可用。</li>
          </ul>
        </section>

        <section id="loops" className="guide-page__section">
          <h2>主链路详解</h2>
          <p>
            核心原则：
            <strong>数据本体单向沉淀，提醒副本联动，时序永不倒流。</strong>
          </p>
          <h3>链路一：思绪沉淀（今时际 → 昔时往）</h3>
          <p>
            写下随笔 → 持续编辑则留在当下 → 空闲达标或手动归档 → 进入馆藏。需要伴读回想时再「进知识库」。
          </p>
          <h3>链路二：未来落地提醒（来日途 ↔ 今时际 → 昔时往）</h3>
          <p>
            创建带截止日期与提前提醒的计划 → 进入提醒窗口后今时际出现临期提醒 →
            完成回写本体并归档，卡片消失。
          </p>
          <h3>链路三：专注记录（凝时 → 昔时往）</h3>
          <p>正向计时或倒计时完整结束 → 可选心得 → 专注记录进馆藏。</p>
          <h3>链路四：回望（昔时往 → 自省 / 伴读）</h3>
          <p>
            馆藏可筛选回看；自省对镜与伴读可基于已进知识库的语料回想——仍禁止把归档原文迁回流动草稿。
          </p>
        </section>

        <section id="walkthrough" className="guide-page__section">
          <h2>推荐：第一次完整走通</h2>
          <ol className="guide-page__steps">
            <li>
              <strong>注册并选主题</strong>
              <span>需要的话，在设置里改自动归档小时数。</span>
            </li>
            <li>
              <strong>写一条每日随笔</strong>
              <span>保存 → 可试润色 → 手动归档 → 馆藏确认；需要时点「进知识库」。</span>
            </li>
            <li>
              <strong>新建单次计划</strong>
              <span>
                设提前提醒使它进入临期窗口 → 点完成 → 馆藏出现规划归档。
              </span>
            </li>
            <li>
              <strong>开一次正向计时</strong>
              <span>结束并写心得 → 馆藏出现专注记录。</span>
            </li>
            <li>
              <strong>（可选）伴读与自省</strong>
              <span>
                问伴读「随笔怎么归档」；进自省「对镜」聊两句。设置 → 伴读保存一次称呼。
              </span>
            </li>
            <li>
              <strong>回首页看摘要</strong>
              <span>确认与刚才操作大致一致。</span>
            </li>
          </ol>
        </section>

        <section id="rules" className="guide-page__section">
          <h2>硬规则（请记住）</h2>
          <ul className="guide-page__rules">
            <li>
              <strong>单向沉淀</strong>
              ：内容最终进昔时往；馆藏正文不可改回「流动中」本体。
            </li>
            <li>
              <strong>临期提醒是副本</strong>
              ：展示来日途；「完成」回写本体；不在卡片上改计划正文。
            </li>
            <li>
              <strong>归档 ≠ 进知识库</strong>
              ：进馆藏是浏览；进知识库才纳入伴读可检索语料。
            </li>
            <li>
              <strong>图片永不进知识库</strong>
              ：插图、记忆碎片图片不参与文本索引；纯图无字不可进库。
            </li>
            <li>
              <strong>时序不倒流</strong>
              ：已归档不以可编辑随笔 / 计划会话形式回流。
            </li>
            <li>
              <strong>只属于你</strong>
              ：业务数据按登录用户隔离。
            </li>
            <li>
              <strong>AI 可选</strong>
              ：未启用时主链路仍可用；伴读 / 自省 / 润色 / 向量检索不可用。
            </li>
            <li>
              <strong>破坏性操作要确认</strong>
              ：删除、未保存离开、注销等。
            </li>
          </ul>
        </section>

        <section id="names" className="guide-page__section">
          <h2>雅名词典</h2>
          <p>仅列常用雅名；更多悬停提示见界面。</p>
          <dl className="guide-page__glossary">
            <div>
              <dt>昔时往</dt>
              <dd>过去沉淀库：回顾已归档的思绪、规划与回忆</dd>
            </div>
            <div>
              <dt>自省</dt>
              <dd>以镜自省：对镜、照时、对照、留痕</dd>
            </div>
            <div>
              <dt>今时际</dt>
              <dd>当下工作台：随笔、临期提醒与灵感捕捉</dd>
            </div>
            <div>
              <dt>来日途</dt>
              <dd>面向未来的规划仓库</dd>
            </div>
            <div>
              <dt>凝时</dt>
              <dd>专注计时：把心神收在当下</dd>
            </div>
            <div>
              <dt>随笔</dt>
              <dd>快速记下当下灵感与草稿，未归档前可随时改</dd>
            </div>
            <div>
              <dt>自动归档</dt>
              <dd>久未改动的每日随笔会沉淀进昔时往；也可提前手动归档</dd>
            </div>
            <div>
              <dt>临期提醒</dt>
              <dd>即将到来的目标与日子的只读卡片（副本）</dd>
            </div>
            <div>
              <dt>馆藏</dt>
              <dd>统一收纳随笔归档、规划归档、专注记录等流入记忆</dd>
            </div>
            <div>
              <dt>进知识库</dt>
              <dd>将文本纳入伴读可检索语料（与归档不同；图片永不进库）</dd>
            </div>
            <div>
              <dt>伴读 / 轻语</dt>
              <dd>右下角桌宠对话与主动气泡</dd>
            </div>
            <div>
              <dt>润色</dt>
              <dd>随笔选区或全文 AI 润色后采纳写回</dd>
            </div>
            <div>
              <dt>正向计时 / 倒计时 / 专注记录</dt>
              <dd>凝时三种入口；结束后沉淀进昔时往</dd>
            </div>
            <div>
              <dt>时间线 / 情绪复盘</dt>
              <dd>年月密度回望；情绪分布与共现统计</dd>
            </div>
          </dl>
        </section>

        <section id="later" className="guide-page__section">
          <h2>现行与后置</h2>
          <p>
            当前已覆盖：账号可信、五大时序入口（含自省）与凝时、馆藏与复盘、设置（含伴读）、富文本与本地插图、首页摘要，以及伴读、润色、自省与知识库检索。
          </p>
          <p>
            明确后置、不必空等：对象存储迁云、OAuth / 手机号、独立 App 等。不改变单向沉淀等硬规则。
          </p>
          <div className="guide-page__callout">
            <p>
              <em>
                写随笔 → 沉淀 · 建计划 → 临期完成归档 · 凝时 → 专注记录 ·
                进知识库后伴读回想 · 自省对镜 · 需要时打开使用说明
              </em>
            </p>
          </div>
          <p>先把日常链路变成肌肉记忆，自宇才会从「好看的词」变成「每天愿意打开的地方」。</p>
        </section>

        <section className="guide-page__section guide-page__section--end">
          <h2>准备好了？</h2>
          {mode === "app" || loggedIn ? (
            <>
              <p>回到首页继续使用，从一条随笔或今日摘要开始即可。</p>
              <div className="guide-page__cta">
                <Link href="/app" className="guest-landing__btn guest-landing__btn--accent">
                  返回首页
                </Link>
              </div>
            </>
          ) : (
            <>
              <p>回到首页开启你的宇宙，或直接登录，从一条随笔开始。</p>
              <div className="guide-page__cta">
                <Link href="/?auth=register" className="guest-landing__btn guest-landing__btn--accent">
                  开启自宇
                </Link>
                <Link href="/?auth=login" className="guest-landing__btn">
                  去登录
                </Link>
                <Link href="/" className="guest-landing__btn">
                  返回首页
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
