# Contributing to PaisaPulse

Thank you for your interest in contributing to **PaisaPulse**!

PaisaPulse is an open-source educational project developed as Day 02 of the *30 Projects in 30 Days* engineering sprint. We welcome improvements to our NLP categorization, regex patterns, time-series forecasting models, and UI components.

---

## Code of Conduct

Please be respectful, constructive, and helpful when opening issues or pull requests.

---

## Development Workflow

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/paisapulse.git
   cd paisapulse
   ```
3. **Create a topic branch**:
   ```bash
   git checkout -b feature/improved-upi-regex
   ```
4. **Make your changes**:
   - Write clean, type-annotated Python (FastAPI/scikit-learn) or TypeScript (Next.js/React).
   - Add automated test cases in `apps/api/tests/` for any new parser patterns or model enhancements.
5. **Run tests**:
   ```bash
   cd apps/api && PYTHONPATH=. pytest -v
   cd ../web && npm run build
   ```
6. **Commit with conventional commit messages**:
   ```bash
   git commit -m "feat(parser): add regex support for ICICI iMobile pay alert format"
   ```
7. **Push to your fork and submit a Pull Request**.

---

## Questions & Contact

For questions or discussions regarding the project architecture, reach out via the [Contact Form](http://localhost:3001/contact) or open an issue on GitHub.
