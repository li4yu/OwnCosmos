/** 二十八宿：宫名、励志短句、示意星位种子 */

export type XingXiu = {
  name: string;
  palace: string;
  motto: string;
  /** 0 东龙 / 1 北玄 / 2 西虎 / 3 南雀 · 影响星图色调与走势 */
  wing: 0 | 1 | 2 | 3;
};

export const XINGXIU: readonly XingXiu[] = [
  { name: "角", palace: "东宫苍龙", wing: 0, motto: "起势如角，先立方向。" },
  { name: "亢", palace: "东宫苍龙", wing: 0, motto: "昂首向前，不畏高处。" },
  { name: "氐", palace: "东宫苍龙", wing: 0, motto: "根基既定，步步可深。" },
  { name: "房", palace: "东宫苍龙", wing: 0, motto: "安住一室，心有所归。" },
  { name: "心", palace: "东宫苍龙", wing: 0, motto: "心火不熄，事必有成。" },
  { name: "尾", palace: "东宫苍龙", wing: 0, motto: "善始善终，收束有力。" },
  { name: "箕", palace: "东宫苍龙", wing: 0, motto: "扬弃糠秕，只留真粒。" },
  { name: "斗", palace: "北宫玄武", wing: 1, motto: "量力而行，亦可致远。" },
  { name: "牛", palace: "北宫玄武", wing: 1, motto: "默耕不辍，岁月成金。" },
  { name: "女", palace: "北宫玄武", wing: 1, motto: "细处用心，方见光华。" },
  { name: "虚", palace: "北宫玄武", wing: 1, motto: "空出一席，好纳新知。" },
  { name: "危", palace: "北宫玄武", wing: 1, motto: "临危不乱，方显定力。" },
  { name: "室", palace: "北宫玄武", wing: 1, motto: "守住阵地，厚积薄发。" },
  { name: "壁", palace: "北宫玄武", wing: 1, motto: "壁垒分明，心志不移。" },
  { name: "奎", palace: "西宫白虎", wing: 2, motto: "文光乍启，思路自开。" },
  { name: "娄", palace: "西宫白虎", wing: 2, motto: "牵系目标，不使游移。" },
  { name: "胃", palace: "西宫白虎", wing: 2, motto: "消化所得，化为己用。" },
  { name: "昴", palace: "西宫白虎", wing: 2, motto: "群星汇聚，一念成团。" },
  { name: "毕", palace: "西宫白虎", wing: 2, motto: "事有尽时，亦有成时。" },
  { name: "觜", palace: "西宫白虎", wing: 2, motto: "锐意一点，破开混沌。" },
  { name: "参", palace: "西宫白虎", wing: 2, motto: "参透难处，再进一步。" },
  { name: "井", palace: "南宫朱雀", wing: 3, motto: "深汲不止，清源自来。" },
  { name: "鬼", palace: "南宫朱雀", wing: 3, motto: "洞见幽微，不惧暗处。" },
  { name: "柳", palace: "南宫朱雀", wing: 3, motto: "柔亦能韧，弯而不折。" },
  { name: "星", palace: "南宫朱雀", wing: 3, motto: "一点微光，足以指路。" },
  { name: "张", palace: "南宫朱雀", wing: 3, motto: "张开格局，容纳更大。" },
  { name: "翼", palace: "南宫朱雀", wing: 3, motto: "展翼之时，正是风起。" },
  { name: "轸", palace: "南宫朱雀", wing: 3, motto: "车辙向前，不回头望。" },
] as const;

export function xiuAtElapsed(ms: number) {
  const i = Math.floor(Math.max(0, ms) / (60 * 1000)) % XINGXIU.length;
  return { index: i, xiu: XINGXIU[i]! };
}

/** 按宿序生成互异星位（确定性，避免每宿同形） */
export function constellationForIndex(index: number): [number, number][] {
  let seed = (index + 3) * 9973;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const wing = XINGXIU[index]?.wing ?? 0;
  const base: [number, number] =
    wing === 0
      ? [280, 250]
      : wing === 1
        ? [520, 160]
        : wing === 2
          ? [560, 340]
          : [320, 360];

  const count = 5 + (index % 4);
  const points: [number, number][] = [];
  const stretch = 0.62 + (index % 5) * 0.06;

  for (let k = 0; k < count; k += 1) {
    const t = k / Math.max(1, count - 1);
    const angle =
      (wing * Math.PI) / 2 +
      t * Math.PI * (1.1 + (index % 3) * 0.18) +
      rand() * 0.35 -
      0.17;
    const radius = 48 + t * (95 + rand() * 70) + (k === 0 ? 0 : rand() * 28);
    const x = base[0] + Math.cos(angle) * radius;
    const y = base[1] + Math.sin(angle) * radius * stretch;
    points.push([
      Math.min(760, Math.max(40, x)),
      Math.min(480, Math.max(40, y)),
    ]);
  }

  // 主星略偏，形成「亮宿」
  const bright = Math.min(points.length - 1, 1 + (index % (points.length - 1 || 1)));
  if (points[bright]) {
    points[bright] = [
      points[bright]![0],
      points[bright]![1],
    ];
  }

  return points;
}

export function brightStarIndex(index: number, len: number) {
  if (len <= 1) return 0;
  return 1 + (index % (len - 1));
}
