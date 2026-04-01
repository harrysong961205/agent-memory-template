# Agent Memory Template

Claude Code 에이전트가 프로젝트 맥락을 유지하며 작업할 수 있도록 하는 초기 설정 템플릿.

## 사용법

### 1. 새 프로젝트에 복사

```bash
# 템플릿 클론
git clone https://github.com/harrysong961205/agent-memory-template.git

# 필요한 파일만 복사
cp agent-memory-template/CLAUDE.md your-project/
cp -r agent-memory-template/.agent-memory your-project/
```

### 2. 프로젝트에 맞게 수정

- `CLAUDE.md` — 포탈/플랫폼 이름을 프로젝트에 맞게 변경
- `.agent-memory/PROJECT_CONTEXT.md` — 프로젝트 기본 정보 채우기
- `.agent-memory/BRAND_CONTEXT.md` — 브랜드/디자인 기준 채우기
- `.agent-memory/IA_TEMPLATE.md` — 플랫폼 이름으로 복사 (예: `IA_WEB.md`, `IA_IOS.md`)

### 3. 에이전트에게 자동 채우기 요청

첫 대화에서:

> "이 프로젝트의 코드를 읽고 `.agent-memory/` 파일들을 현재 코드 기준으로 채워줘."

## 파일 구조

```
project-root/
├── CLAUDE.md                              ← 에이전트 행동 규칙
└── .agent-memory/
    ├── PROJECT_CONTEXT.md                 ← 프로젝트 기본 정보
    ├── BRAND_CONTEXT.md                   ← 브랜드/디자인 기준
    ├── SCHEMA_SUMMARY.md                  ← DB 스키마 요약
    ├── FEATURE_MAP.md                     ← 기능별 코드 위치 매핑
    ├── IA_TEMPLATE.md                     ← 플랫폼별 IA (복사해서 사용)
    ├── ROADMAP.md                         ← TODO / 백로그
    └── WORKING_LOG.md                     ← 작업 이력
```

## 핵심 원리

| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | 에이전트가 "어떻게 행동해야 하는지" (규칙) |
| `FEATURE_MAP` | "지금 뭐가 어디에 있는지" (영향 범위) |
| `IA_*.md` | "각 플랫폼에 뭐가 있고 없는지" (현재 상태) |
| `Reference First` 규칙 | 기존 구현 무시하고 새로 만드는 걸 방지 |
| `완전성 체크` 규칙 | happy path만 만들고 끝내는 걸 방지 |
| 문서 수정 알림 규칙 | 조용히 바꾸는 걸 방지 |

## 이 템플릿이 해결하는 문제들

- 에이전트가 세션 바뀌면 맥락을 잃는 문제
- 회원가입 만들라고 했는데 로그인만 만드는 문제 (완전성)
- 웹에 있는 필드를 모바일에서 빼먹는 문제 (Reference First)
- 한 플랫폼만 고치고 다른 플랫폼은 안 고치는 문제 (크로스 플랫폼 체크)
- 문서를 수정했는데 말 안 하는 문제 (알림 규칙)
