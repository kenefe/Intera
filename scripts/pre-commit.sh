#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Flow F 自动检查 — git pre-commit hook
#  检查三位一体: 代码变更必须伴随测试和文档
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# 获取暂存区的文件列表
STAGED=$(git diff --cached --name-only --diff-filter=ACMR)

HAS_CODE=false
HAS_TEST=false
HAS_DOC=false
WARNINGS=""

# 检查是否有代码变更
for f in $STAGED; do
  case "$f" in
    src/*.ts|src/*.vue) HAS_CODE=true ;;
    tests/*.spec.ts|tests/*.spec.js) HAS_TEST=true ;;
    *.md|docs/*) HAS_DOC=true ;;
  esac
done

# 如果没有代码变更，跳过检查
if [ "$HAS_CODE" = false ]; then
  exit 0
fi

# 检查三位一体
ERRORS=0

if [ "$HAS_TEST" = false ]; then
  WARNINGS="${WARNINGS}\n${YELLOW}⚠ 缺测试: 代码变更但没有 .spec.ts 文件${NC}"
  ERRORS=$((ERRORS + 1))
fi

if [ "$HAS_DOC" = false ]; then
  WARNINGS="${WARNINGS}\n${YELLOW}⚠ 缺文档: 代码变更但没有 .md 文件${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 检查 commit message 是否有 [F✓]
# (pre-commit 阶段拿不到 message，这个在 commit-msg hook 里检查)

# 检查文件行数
for f in $STAGED; do
  case "$f" in
    src/*.ts)
      LINES=$(wc -l < "$f" 2>/dev/null || echo 0)
      if [ "$LINES" -gt 200 ]; then
        WARNINGS="${WARNINGS}\n${RED}❌ 纯 TS 超标: $f ($LINES 行 > 200)${NC}"
        ERRORS=$((ERRORS + 1))
      fi
      ;;
    src/*.vue)
      LINES=$(wc -l < "$f" 2>/dev/null || echo 0)
      if [ "$LINES" -gt 400 ]; then
        WARNINGS="${WARNINGS}\n${RED}❌ Vue SFC 超标: $f ($LINES 行 > 400)${NC}"
        ERRORS=$((ERRORS + 1))
      fi
      ;;
  esac
done

# 输出结果
if [ $ERRORS -gt 0 ]; then
  echo -e "\n${RED}━━━ Flow F 自动检查 ━━━${NC}"
  echo -e "$WARNINGS"
  echo -e "\n${YELLOW}提示: 用 git commit --no-verify 跳过 (仅紧急情况)${NC}\n"
  exit 1
fi

echo -e "${GREEN}✓ Flow F 检查通过${NC}"
exit 0
