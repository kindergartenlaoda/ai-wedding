# OpenClaw 系统提示词文章 — 配图提示词

> **统一视觉风格定义**
>
> - **风格**：扁平化科技插画（Flat Tech Illustration），线条干净，几何化图形
> - **配色方案**：深靛蓝底色（#0F172A），青蓝主色调（#06B6D4 / #3B82F6），暖橙强调色（#F59E0B），白色文字/线条（#F8FAFC）
> - **质感**：轻微渐变 + 柔和发光（glow），无阴影，无3D效果
> - **构图**：居中对称或黄金分割，留白充足，适配公众号 2:1 ~ 16:9 横版比例
> - **元素**：圆角矩形卡片、虚线连接线、图标化抽象符号、等宽字体代码片段点缀
> - **无文字或仅英文标签**（避免中文渲染质量问题，文字由文章本身提供）

---

## 1. 封面图 / 题图

**对应章节**：标题 — 系统提示词长什么样？OpenClaw 如何组装一份"可控的 AI 运行说明书"

**提示词**：

```
A wide horizontal hero illustration (1920x960, 2:1 ratio) in flat tech style. Dark indigo background (#0F172A). Center composition: a large glowing blueprint scroll unfurling, with modular UI cards and code blocks floating out of it — representing an "AI instruction manual". Each card has a small icon (gear, brain, shield, clock, wrench). Thin cyan (#06B6D4) glowing connection lines link the cards together. A subtle robotic eye peeks from behind the scroll, symbolizing AI reading its instructions. Warm amber (#F59E0B) accent on key elements. No text. Clean, minimal, modern.
```

---

## 2. 隐藏文本

**对应章节**：一、你可能从未见过的"隐藏文本"

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A stylized chat interface: a user's small message bubble ("Hi") floats at the bottom right. Above and behind it, a massive translucent document unfolds upward, filled with rows of abstract code lines, icons (gear, shield, brain, clock, person), and structured blocks — representing the invisible system prompt the AI reads before the user's message. The document glows faintly in cyan (#06B6D4), while the user's bubble is warm amber (#F59E0B). A subtle "iceberg" metaphor: the small visible tip (user message) vs the huge hidden base (system prompt). Clean, geometric, no text.
```

---

## 3. 系统提示词 13 模块结构图

**对应章节**：二、一份真实的系统提示词，长这样

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A large vertical stack of 13 modular rounded-rectangle cards, neatly arranged in two columns with thin cyan glowing borders. Each card has a distinct small icon: gear (Runtime), brain (Reasoning), heart-pulse (Heartbeats), tag (Reply Tags), clock (Date/Time), box (Sandbox), folder (Workspace), book (Documentation), refresh (Self-Update), puzzle (Skills), shield (Safety), wrench (Tooling), file-stack (Project Context). The last card (Project Context) is noticeably larger than others, glowing amber (#F59E0B), representing its dominant token share. A translucent bracket on the left groups all cards together with a scroll icon. A small token counter badge in the corner. Clean lines, minimal, no text.
```

---

## 4. 人格档案 / 工作区引导文件

**对应章节**：三、第二层：人格与身份（Project Context）

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A workspace folder icon in the center, opened to reveal 7 floating Markdown file cards arranged in a fan layout. Each card has a unique icon: AGENTS.md (clipboard), SOUL.md (ghost/spirit), USER.md (person silhouette), IDENTITY.md (name badge), TOOLS.md (toolbox), HEARTBEAT.md (pulse line), MEMORY.md (brain with bookmark). Glowing cyan arrows flow from each card into a central glowing orb representing the "System Prompt injection point". Warm amber glow on the orb. A pencil icon near the cards suggests editability — implying anyone can modify these text files to reshape AI behavior. Clean, geometric, no text.
```

---

## 5. 技能按需加载

**对应章节**：三、第三层：技能目录（按需加载）

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A bookshelf metaphor: a horizontal shelf with several book spines (each a different color accent — amber, teal, purple, green, pink) representing available skills. One book is being pulled out by a glowing robotic hand, opened to reveal a Markdown document icon — representing on-demand skill loading. Above the shelf, a compact index card with tiny book icons represents the lightweight skill list in the system prompt (small, ~546 tokens). A dotted arrow from the index card to the pulled book shows "load on demand". A small coin/token icon near the index card implies cost savings. Clean, geometric, no text.
```

---

## 6. 组装流程

**对应章节**：四、组装流程：一份提示词是怎么"拼"出来的

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A top-to-bottom assembly pipeline visualization: at the top, an envelope icon (incoming message); flowing down through stages — a lock icon (session lock), a folder icon fanning out Markdown files (load workspace files), a funnel/mixer icon combining multiple cards into one document (build system prompt), a stack icon merging prompt + history + tools (assemble final context), a brain icon with gear (model inference with tool loop shown as a small circular sub-arrow), a signal-wave icon (stream response), a disk icon (persist session). Stages connected by glowing cyan (#06B6D4) arrows. Three small hook icons at key stages represent interceptable decision points (how much, for whom, hook override). Clean, minimal, no text.
```

---

## 7. 压缩与记忆

**对应章节**：五、对话太长怎么办：压缩与记忆的协作

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. Split into two connected halves. Left half — Compression: a tall stack of many thin message cards (long conversation) flows into a funnel/compressor machine with gears glowing cyan, outputting a compact summary card (glowing amber) plus a few recent full message cards. A small brain icon with a save-arrow near the compressor represents the "silent memory flush" before compression. Right half — Two-layer Memory: top layer shows a glowing star-book icon (MEMORY.md, long-term, injected every time) with a direct arrow into the system prompt; bottom layer shows calendar-page icons (daily logs) connected to a magnifying glass with vector dots (semantic search, loaded on demand). A dotted line separates the two layers. Clean, geometric, no text.
```

---

## 8. 上下文窗口账本

**对应章节**：六、上下文的完整账本

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A large transparent container (like a glass jar or vertical progress bar) representing the 32K context window. Inside, layered horizontal bands of different colors stacked bottom-to-top: system prompt base template (cyan, ~3,600 tok), Project Context (deeper cyan, ~6,000 tok), tool JSON schemas (teal, ~8,000 tok), conversation history / compressed summaries (blue, ~12,000 tok), current message + attachments (amber, ~2,000 tok), provider hidden headers (gray, ~400 tok). A fill-level indicator on the side shows it at near capacity. A label bracket highlights that system prompt + tool schemas together exceed half the window. Clean, minimal, no text.
```

---

## 9. 设计哲学 / 总结架构图

**对应章节**：七、设计哲学：五个值得借鉴的原则

**提示词**：

```
Flat tech illustration (1600x900, 16:9). Dark indigo background. A grand tree diagram radiating from a central "System Prompt" document icon at the core. Nine branches extend outward, each ending in a themed icon: server rack (Runtime), ghost (Personality), person (User Profile), clipboard (Instructions), wrench (Tools), puzzle (Skills), brain-bookmark (Memory), shield (Safety), clock (Time Awareness). The branches glow in alternating cyan and amber. At the base, five pillar icons represent the design philosophy: slider (Controllability), eye (Transparency), coin (Economy), refresh-arrows (Dynamism), layered-shield (Layered Security). The five pillars support the tree, forming a stable foundation. Harmonious, balanced, grand but clean. No text.
```

---

## 使用建议

1. **生成工具推荐**：Midjourney v6.1+、DALL·E 3、Ideogram 2.0、Flux Pro — 任选其一
2. **统一种子值**：在 Midjourney 中可使用 `--seed 42` 保持系列图风格一致
3. **后期微调**：可在 Canva / Figma 中添加中文标注文字
4. **公众号适配**：封面图用 2.35:1（900×383px），正文配图用 16:9（1080×607px）
5. **色彩一致性**：如果生成结果偏色，可在提示词开头追加 `Color palette: #0F172A, #06B6D4, #3B82F6, #F59E0B, #F8FAFC --no bright red, neon green`
