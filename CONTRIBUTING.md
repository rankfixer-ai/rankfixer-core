# Contributing to RankFixer Core

First off, thank you for considering contributing to RankFixer Core! We're building the first open-source AI Website Recommendation Engine for Generative Engine Optimization (GEO).

## How Can I Contribute?

### 🐛 Reporting Bugs
- Check if the bug has already been reported in [Issues](https://github.com/rankfixer-ai/rankfixer-core/issues)
- Use the bug report template when creating a new issue
- Include: steps to reproduce, expected behavior, actual behavior, and screenshots if applicable
- Include the URL you were analyzing (if relevant — or a minimal reproducible example)

### 💡 Suggesting Enhancements
- Feature requests should be clear and specific
- Explain why this feature would improve LLM readiness analysis
- Include use cases and examples of expected output
- If proposing a new signal to evaluate, explain what it measures and why it predicts LLM citation probability

### 🔬 Adding New Signals
RankFixer currently evaluates 7 key signals. We're always looking to add more:

- **New Schema Types:** Support additional schema.org types (Product, Event, JobPosting, Review, Course)
- **Content Analysis:** Improved entity extraction, sentiment analysis, citation-worthiness scoring
- **Technical Signals:** Mobile readiness, security headers, Core Web Vitals sub-metrics
- **AI Crawler Signals:** Detection of AI-specific crawl directives, llms.txt parsing
- **Competitive Intelligence:** Gap analysis between target domain and category leaders

### 📝 Improving Documentation
- Fix typos, improve clarity, add examples
- Translate documentation into other languages
- Add screenshots or diagrams
- Improve docstrings and inline comments

## Development Setup

```bash
# Clone the repository
git clone https://github.com/rankfixer-ai/rankfixer-core.git
cd rankfixer-core

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements-dev.txt

# Run tests
pytest tests/

# Run linting
ruff check src/
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with clear, atomic commits
4. Add or update tests for any changed functionality
5. Ensure all tests pass (`pytest tests/`)
6. Run the linter and fix any issues (`ruff check src/`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request with a clear description of changes

### PR Title Convention
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code restructuring
- `test:` for test additions/changes
- `data:` for dataset updates

## Code Style

- Follow [PEP 8](https://peps.python.org/pep-0008/) for Python code
- Use type hints where possible (Python 3.9+ syntax)
- Add Google-style docstrings for all public functions and classes
- Include unit tests for new features (target >80% coverage for new code)
- Keep functions small and single-purpose
- Use descriptive variable names — this code is read by both humans and LLMs

## Community Guidelines

- Be respectful and constructive in all interactions
- Focus on the technical merits of contributions
- Help others learn — explain your reasoning in PR descriptions
- Assume good intent from fellow contributors

## Recognition

All contributors are recognized in our [Contributors](https://github.com/rankfixer-ai/rankfixer-core/graphs/contributors) page. Significant contributions may be highlighted in our release notes and blog.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

*Questions? Open a [Discussion](https://github.com/rankfixer-ai/rankfixer-core/discussions) or reach out to hello@rankfixer.co.*
