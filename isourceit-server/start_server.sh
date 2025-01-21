#!/bin/sh

echo "START SERVER..."
# -u is important to not buffer console I/O that could cause no showing output to console in some docker platform (macos especially)
python -m ChatAIExamServer $@