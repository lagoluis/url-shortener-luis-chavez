# 📦 Packaging Guide for Take-Home Assessment

## Files to EXCLUDE from ZIP:

### Large/Regeneratable:
- `*/node_modules/` - Can be reinstalled with `npm install`
- `.git/` - Version control history (unnecessary for submission)
- `backend/prisma/dev.db` - Will be recreated with `npm run migrate && npm run seed`

### Logs/Temporary:
- `*.log`
- `npm-debug.log*`
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)

### IDE/Editor:
- `.vscode/`
- `.idea/`
- `*.swp`, `*.swo`

## Files to INCLUDE:

### Essential:
✅ `backend/.env` - Database configuration
✅ `frontend/.env.local` - API base URL  
✅ `README.md` - Setup instructions
✅ All source code (`src/`, `tests/`, etc.)
✅ `package.json` files - Dependencies
✅ `prisma/` directory - Schema and migrations

## ZIP Command:

```bash
# From parent directory of url-shortener/
zip -r url-shortener-assessment.zip url-shortener \
  -x "*/node_modules/*" \
     "*/.git/*" \
     "*.log" \
     "*/.DS_Store" \
     "*/prisma/dev.db"
```

## Alternative (GUI):
1. Copy `url-shortener` folder
2. Delete `node_modules` folders from both backend and frontend
3. Delete `.git` folder  
4. Compress the cleaned folder
