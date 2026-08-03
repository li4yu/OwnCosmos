import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "使用说明 · 自宇",
  description: "自宇（My Own Cosmos）详细使用指南：模块、闭环、操作步骤与硬规则",
};

export default function GuidePage() {
  return (
    <div className="guide-page">
      <header className="guide-page__topbar">
        <Link href="/" className="guide-page__brand">
          <span>自宇</span>My Own Cosmos
        </Link>
        <div className="guide-page__actions">
          <ThemeToggle />
          <Link href="/?auth=login" className="guest-landing__chip">
            登录
          </Link>
          <Link
            href="/?auth=register"
            className="guest-landing__chip guest-landing__chip--accent"
          >
            开启
          </Link>
        </div>
      </header>

      <main className="guide-page__main">
        <p className="guide-page__eyebrow">USER GUIDE · 使用说明</p>
        <h1>如何走进并使用自宇</h1>
        <p className="guide-page__lede">
          自宇（My Own Cosmos）是一座只属于你的精神宇宙。它不是普通的待办或笔记文件夹，而是以<strong>时序成长</strong>为轴：思绪、规划与专注会随时间流动、定型、沉淀，形成可回望的闭环。
        </p>
        <p className="guide-page__lede guide-page__lede--soft">
          本文说明「怎么理解」与「怎么操作」。界面上的雅名可悬停查看一句提示；拿不准时，回到本页对照即可。
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
          <a href="#loops">主链路详解</a>
          <a href="#walkthrough">推荐走通一遍</a>
          <a href="#rules">硬规则</a>
          <a href="#names">雅名词典</a>
          <a href="#later">后续会有什么</a>
        </nav>

        <section id="what" className="guide-page__section">
          <h2>它是什么</h2>
          <p>
            每个人都拥有一座只属于自己的精神宇宙。世俗工具往往「功能优先」；自宇以<strong>人的时序成长</strong>为核心——思绪、灵感、计划、回忆会随着时间流动、定型、沉淀。
          </p>
          <p>三大时间维度（再加上专注）：</p>
          <ul className="guide-page__rules">
            <li>
              <strong>昔时往</strong>：所有已成过往的记忆与经历（沉淀态）
            </li>
            <li>
              <strong>今时际</strong>：当下正在发生、流动、思考的自我（流动态）
            </li>
            <li>
              <strong>来日途</strong>：未来期待、目标、可期的前路（待发生态）
            </li>
            <li>
              <strong>凝时</strong>：把心神收在一段光阴里，留下可计量的凝录（凝神态）
            </li>
          </ul>
          <p>
            产品目标可以写成一句：在专属私人宇宙中<strong>留存过往、安住当下、奔赴未来</strong>，并以专注把光阴凝成可回望的轨迹。
          </p>
        </section>

        <section id="diff" className="guide-page__section">
          <h2>与普通工具的差别</h2>
          <p>
            备忘录、日记、待办往往把内容放进静态文件夹；自宇里的数据带着<strong>生命周期与自动流转规则</strong>：
          </p>
          <ul className="guide-page__rules">
            <li>当下写的随笔，久未触碰会<strong>逾时沉淀</strong>进过往，不让「现在」被旧稿堆满。</li>
            <li>未来的计划到达提醒窗口，会以<strong>临期帖</strong>映到当下；完成后再沉入过往。</li>
            <li>专注结束留下<strong>凝录</strong>，同样进入馆藏，而不是只剩一个计时数字。</li>
            <li>过往<strong>不倒流</strong>成可编辑草稿——可以回望，但时序单向沉淀。</li>
          </ul>
          <div className="guide-page__callout">
            <p>
              成长闭环：
              <em>当下思考 → 未来规划 → 专注落地 → 过往沉淀 → 再启新生思考</em>
            </p>
          </div>
        </section>

        <section id="map" className="guide-page__section">
          <h2>时序地图（登录后怎么走）</h2>
          <p>
            顶栏顺序是<strong>过去 → 现在 → 将来 → 专注</strong>：首页 → 昔时往 → 今时际 → 来日途 → 凝时。品牌「自宇」是标识，回首页请点「首页」。
          </p>
          <p>二级入口均已开放：</p>
          <ul className="guide-page__rules">
            <li>
              <strong>昔时往</strong>：拾忆馆藏（分区含随笔沉淀 / 规划归档 / 凝录 / 碎片等）、往迹廊、心绪鉴。
            </li>
            <li>
              <strong>今时际</strong>：流思笺、临期帖（可延期、缘想）。
            </li>
            <li>
              <strong>来日途</strong>：规划、轮期、时间胶囊、日课。
            </li>
            <li>
              <strong>凝时</strong>：顺钟、逆漏、凝录列表。
            </li>
          </ul>
        </section>

        <section id="account" className="guide-page__section">
          <h2>账号与设置</h2>
          <h3>注册 / 登录 / 退出</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>注册</strong>
              <span>
                在首页点「开启」或「注册」：填写邮箱与密码后，在<strong>同一页</strong>点「发送验证码」，填入 6 位码后「验证并注册」。未配置 SMTP 时验证码打印在服务端控制台。
              </span>
            </li>
            <li>
              <strong>登录</strong>
              <span>
                已有账号点「登录」。未登录时不能进入业务数据页。忘记密码：邮箱收验证码后设置新密码。
              </span>
            </li>
            <li>
              <strong>设置 · 账号</strong>
              <span>
                可修改密码；可注销账号（需确认密码，硬删全部个人数据，不可恢复）。
              </span>
            </li>
            <li>
              <strong>退出</strong>
              <span>在设置或头像菜单退出登录，会话清除后需重新登录才能读写个人数据。</span>
            </li>
          </ol>

          <h3>个人资料</h3>
          <p>
            可修改昵称、简介，并上传头像。保存后首页问候与各处展示名会同步更新。
          </p>

          <h3>外观主题</h3>
          <p>
            提供两套气质：<strong>深空夜色</strong>与<strong>时光卡其</strong>。偏好会写入账号；登录后主要在「设置 → 外观」切换，与整站色板一致。
          </p>

          <h3>流思笺 · 归档空闲时长</h3>
          <p>
            在设置中可配置：随笔连续多久<strong>没有任何编辑</strong>后自动逾时沉淀。默认多为 48 小时；改小可更快沉淀，改大则草稿在今时际停留更久。
            每次编辑会重置这笔「空闲计时」。进站补算与后台定时任务会双保险执行归档。
          </p>

          <h3>通知、回望与凝时偏好</h3>
          <p>
            设置中可开关桌面通知（临期 / 同年回望）、同年回望轻提示，以及凝时「勿扰」、逆漏默认时长。导出未归档随笔与开放中的计划文本也在设置页。
          </p>
        </section>

        <section id="home" className="guide-page__section">
          <h2>首页</h2>
          <p>登录后的首页用于「一眼看见今天」并快速进入模块，通常包括：</p>
          <ul className="guide-page__rules">
            <li>
              <strong>问候与氛围</strong>：进入你的时序宇宙。
            </li>
            <li>
              <strong>今日摘要</strong>：例如临期数量、未归档随笔数、今日专注累计等，便于决定先处理什么。
            </li>
            <li>
              <strong>模块入口 / 快捷动作</strong>：一键去写随笔、新建计划或开顺钟。
            </li>
          </ul>
        </section>

        <section id="present" className="guide-page__section">
          <h2>今时际 · 怎么用</h2>
          <p>
            今时际是<strong>当下工作台</strong>：捕捉瞬时思绪，并承接来自未来的提醒。内容动态可变；该沉淀时会单向流入昔时往。
          </p>

          <h3>流思笺（每日随笔 / 专题随笔）</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>每日随笔</strong>
              <span>
                进入今时际 → 流思笺 → 每日随笔 → 新建。随手记灵感；填写标题与正文后手动保存。离开未保存页面时有确认小窗。
              </span>
            </li>
            <li>
              <strong>专题随笔</strong>
              <span>
                先建一个专题夹（如「工作」），再往夹里写多篇相关随笔。专题篇<strong>不会</strong>自动逾时沉淀；也<strong>不能</strong>单篇归档，须「归档专题」：馆藏出现一条「专题归档」夹，点开可看夹内各篇。
              </span>
            </li>
            <li>
              <strong>手动归档（每日随笔）</strong>
              <span>
                觉得这条每日随笔已告一段落，可手动归档：从流动列表消失，在昔时往 · 拾忆馆藏「随笔沉淀」中出现只读快照。
              </span>
            </li>
            <li>
              <strong>自动逾时沉淀（仅每日随笔）</strong>
              <span>
                若持续达到你设置的空闲小时数且无任何编辑，系统会在进站补算或定时任务中把它自动归档。专题随笔不参与此项。
              </span>
            </li>
            <li>
              <strong>删除</strong>
              <span>
                仅流动中的随笔可硬删除（需确认）。已进馆藏的条目按馆藏规则处理，不能当成草稿删改正文。
              </span>
            </li>
          </ol>

          <h3>临期帖</h3>
          <p>
            临期帖不是第二个计划本，而是来日途计划在提醒窗口内的<strong>只读倒影</strong>：
          </p>
          <ul className="guide-page__rules">
            <li>卡片上可看名称、剩余天数等，<strong>不要</strong>在卡片上改计划正文。</li>
            <li>点「完成」会回写到来日途本体，并触发规划归档；对应卡片随之清除。</li>
            <li>可<strong>延期</strong>（回写截止日期）或写<strong>缘想</strong>（生成一条带溯源的流思笺）。不提供「关闭单条提醒」。</li>
          </ul>

          <h3>织网能力（随笔侧）</h3>
          <p>
            编辑随笔时可<strong>借忆</strong>（检索昔时往插入复制）、打<strong>绪签</strong>与固定心情；全局关键词检索与素材匣可跨模块调取（复制，不迁移原文）。
          </p>
        </section>

        <section id="future" className="guide-page__section">
          <h2>来日途 · 怎么用</h2>
          <p>
            来日途是<strong>远期规划仓库</strong>：计划本体住在这里。提醒同步到今时际；到期或完成后，终成过往。
          </p>

          <h3>规划 / 轮期 / 日课 / 时间胶囊</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>规划</strong>
              <span>
                单次事件或长期愿景：标题、描述、截止日期、<strong>临期配</strong>；可从流思笺「提炼」生成并可溯源。
              </span>
            </li>
            <li>
              <strong>轮期</strong>
              <span>
                日 / 周 / 月 / 年 / 自定义天数；当期结束归档并滚下一期；子任务可记次。
              </span>
            </li>
            <li>
              <strong>日课</strong>
              <span>每日打卡，可写一句心得；完成记录会沉淀进馆藏。</span>
            </li>
            <li>
              <strong>时间胶囊</strong>
              <span>指定日期解锁；未到期不可读全文。</span>
            </li>
            <li>
              <strong>临期与完成</strong>
              <span>
                进入提醒窗口后今时际出现临期帖；完成回写本体并归档，卡片清除。
              </span>
            </li>
          </ol>
        </section>

        <section id="focus" className="guide-page__section">
          <h2>凝时 · 怎么用</h2>
          <p>
            凝时把注意力凝成可计量的光阴：<strong>顺钟</strong>正向累计，<strong>逆漏</strong>倒数到点；结束后留下<strong>凝录</strong>。
          </p>
          <ol className="guide-page__steps">
            <li>
              <strong>顺钟 / 逆漏</strong>
              <span>
                可选绑定来日途目标（规划 / 日课 / 轮期）。逆漏默认时长可在设置中改；开启勿扰后到点只暂停不弹窗。
              </span>
            </li>
            <li>
              <strong>专注中写随笔</strong>
              <span>可一键唤起流思笺弹窗，计时不中断；随笔可溯源到本次会话。</span>
            </li>
            <li>
              <strong>结束并写心得</strong>
              <span>确认后生成凝录（含时长等），自动进拾忆馆藏；凝录列表亦可查看。</span>
            </li>
          </ol>
        </section>

        <section id="past" className="guide-page__section">
          <h2>昔时往 · 怎么用</h2>
          <p>
            昔时往是<strong>永久记忆馆藏与时序沉淀底座</strong>。承接流思笺归档、规划终局、凝时凝录。气质是：已成定局、可回顾，不逆向回流。
          </p>

          <h3>拾忆馆藏</h3>
          <ol className="guide-page__steps">
            <li>
              <strong>浏览与操作</strong>
              <span>
                按类型分区；支持标题模糊、时间范围与分页。可藏忆 / 取消藏忆、抹忆（硬删流入类），以及上传记忆碎片（图片默认不进知识库）。
              </span>
            </li>
            <li>
              <strong>打开详情</strong>
              <span>
                正文只读；可补改绪印。元信息含归档时间、方式、来源、停留时长等。
              </span>
            </li>
            <li>
              <strong>引用新建</strong>
              <span>
                可从昔时往引用复制为新随笔或新计划；禁止把归档原文迁移回可编辑本体。
              </span>
            </li>
          </ol>

          <h3>往迹廊与心绪鉴</h3>
          <p>
            往迹廊提供岁轴密度与同年回望；心绪鉴有绪谱、岁简与绪因（情绪 × 主题共现，无 AI 文案）。
          </p>
        </section>

        <section id="loops" className="guide-page__section">
          <h2>主链路详解</h2>
          <p>核心原则可以记成：<strong>数据本体单向沉淀，提醒副本联动，时序永不倒流。</strong></p>

          <h3>链路一：思绪沉淀（今时际 → 昔时往）</h3>
          <p>
            你在流思笺写下念头 → 持续编辑则留在当下 → 空闲达标自动归档，或手动归档 → 进入拾忆馆藏「随笔沉淀」。
            归档后今时际列表不再出现该条流动草稿。
          </p>

          <h3>链路二：未来落地提醒（来日途 ↔ 今时际 → 昔时往）</h3>
          <p>
            你在来日途创建带截止日期与临期配的计划 → 进入提醒窗口后，今时际生成临期帖副本 →
            在副本上完成会回写本体 → 规划归档进昔时往，卡片消失。
          </p>
          <p>
            注意：副本隔离——改展示状态不等于随便改未来仓库里的正文；完成才是对本体的郑重回写。
          </p>

          <h3>链路三：专注凝录（凝时 → 昔时往）</h3>
          <p>
            顺钟开始并完整结束 → 可选心得 → 凝录生成并自动进馆藏。专注不再只是感觉，而成为可回望的轨迹。
          </p>

          <h3>查阅与引用（原则）</h3>
          <p>
            模块之间可以互相对照、溯源；允许「参考过往再写新的」，但<strong>禁止把已归档原文迁移回流动态</strong>。引用自由，迁移禁止。
          </p>
        </section>

        <section id="walkthrough" className="guide-page__section">
          <h2>推荐：第一次完整走通</h2>
          <p>若你想验证「自宇是否对你顺手」，按下面顺序走一遍最清楚：</p>
          <ol className="guide-page__steps">
            <li>
              <strong>注册并选主题</strong>
              <span>需要的话，在设置里改流思笺自动归档小时数。</span>
            </li>
            <li>
              <strong>写一条流思笺</strong>
              <span>保存 → 列表可见 → 可再编辑。然后手动归档，去拾忆馆藏确认「随笔沉淀」出现。</span>
            </li>
            <li>
              <strong>（可选）再体验自动沉淀</strong>
              <span>
                再建一条草稿；若你把空闲小时调得很短，稍后进站可看到它自动进馆藏（测试用，日常可改回舒适值）。
              </span>
            </li>
            <li>
              <strong>新建单次计划</strong>
              <span>
                设截止日期与临期配，使它立刻或很快进入提醒窗口 → 今时际出现临期帖 → 点完成 →
                馆藏出现规划归档，卡片消失。
              </span>
            </li>
            <li>
              <strong>开一次顺钟</strong>
              <span>专注一段时间 → 结束并写一句心得 → 馆藏出现凝录；首页摘要中的专注相关数字也会更新。</span>
            </li>
            <li>
              <strong>回首页看摘要</strong>
              <span>确认临期、未归档随笔、今日专注等与刚才操作大致一致，并习惯从首页跳进四大模块。</span>
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
              <strong>临期帖是副本</strong>
              ：展示来日途；「完成」回写本体；不在卡片上改计划正文。
            </li>
            <li>
              <strong>归档 ≠ 知识库</strong>
              ：进拾忆馆藏是归档浏览；「藏忆」是知识库标记（当前为布尔标记，语义检索后置）。二者不是一回事。
            </li>
            <li>
              <strong>时序不倒流</strong>
              ：已归档不以可编辑随笔 / 计划会话形式回流。
            </li>
            <li>
              <strong>雅名悬停</strong>
              ：看见雅名时悬停可读一句说明，降低「词美但看不懂」的负担。
            </li>
            <li>
              <strong>只属于你</strong>
              ：业务数据按登录用户隔离；未登录不能读写个人宇宙。
            </li>
            <li>
              <strong>破坏性操作要确认</strong>
              ：删除、未保存离开等使用主题确认小窗，而不是浏览器生硬弹窗。
            </li>
          </ul>
        </section>

        <section id="names" className="guide-page__section">
          <h2>雅名词典</h2>
          <p>仅列出当前使用说明里最常遇到的雅名；更多子能力会在后续版本出现在界面中。</p>
          <dl className="guide-page__glossary">
            <div>
              <dt>昔时往</dt>
              <dd>过去沉淀库：回顾已归档的思绪、规划与回忆</dd>
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
              <dt>流思笺</dt>
              <dd>快速记下当下灵感与草稿，未归档前可随时改</dd>
            </div>
            <div>
              <dt>逾时沉淀</dt>
              <dd>久未改动的随笔会沉淀进昔时往；也可提前手动归档</dd>
            </div>
            <div>
              <dt>临期配</dt>
              <dd>为计划设置提前几天在今时际弹出提醒</dd>
            </div>
            <div>
              <dt>临期帖</dt>
              <dd>展示即将到来的目标与日子的只读卡片（副本）</dd>
            </div>
            <div>
              <dt>拾忆馆藏</dt>
              <dd>统一收纳随笔沉淀、规划归档、凝录等流入记忆</dd>
            </div>
            <div>
              <dt>顺钟</dt>
              <dd>正向累计专注时长，可暂停、继续、结束</dd>
            </div>
            <div>
              <dt>凝录</dt>
              <dd>专注结束后的记录：时长与心得，沉淀进昔时往</dd>
            </div>
            <div>
              <dt>藏忆</dt>
              <dd>将文本标记进知识库集合（与「归档进馆藏」不同；图片永不进库）</dd>
            </div>
            <div>
              <dt>逆漏</dt>
              <dd>设定时长倒数，到点提醒，适合限时任务</dd>
            </div>
            <div>
              <dt>往迹廊</dt>
              <dd>岁轴回望沉淀密度；可开同年回望提示</dd>
            </div>
            <div>
              <dt>心绪鉴</dt>
              <dd>绪谱、岁简与绪因：用规则统计看情绪与主题</dd>
            </div>
          </dl>
        </section>

        <section id="later" className="guide-page__section">
          <h2>后续会有什么（不必现在找）</h2>
          <p>
            主闭环与增强模块（轮期、逆漏、往迹廊、藏忆、借忆等）已可用。更后的能力包括：账号可信加固、富文本与对象存储、以及 AI
            语义检索 / 岁简文案等——见实现阶段规划近程 Phase，不必在界面里空等占位。
          </p>
          <div className="guide-page__callout">
            <p>
              <em>
                写随笔 → 沉淀 · 建计划 / 轮期 → 临期完成归档 · 顺钟或逆漏 → 凝录 ·
                往迹廊与心绪鉴回望
              </em>
            </p>
          </div>
          <p>先把日常链路变成肌肉记忆，自宇才会从「好看的词」变成「每天愿意打开的地方」。</p>
        </section>

        <section className="guide-page__section guide-page__section--end">
          <h2>准备好了？</h2>
          <p>回到首页开启你的宇宙，或直接登录，从一条流思笺开始。</p>
          <div className="guide-page__cta">
            <Link href="/" className="guest-landing__chip">
              返回首页
            </Link>
            <Link
              href="/?auth=register"
              className="guest-landing__chip guest-landing__chip--accent"
            >
              开启自宇
            </Link>
            <Link href="/?auth=login" className="guest-landing__chip">
              去登录
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
