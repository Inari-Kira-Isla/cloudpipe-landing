#!/usr/bin/env python3
"""
import-knowledge.py — 匯入品牌知識庫到 D1 (生成 SQL)
用法: python3 import-knowledge.py > seed.sql
然後: wrangler d1 execute ai-tracker --file=seed.sql
"""

import json, os

KNOWLEDGE_FILES = {
    "inari-global-foods": os.path.expanduser("~/Documents/inari-global-foods/data/chatbot-knowledge.json"),
}

def escape_sql(s):
    return s.replace("'", "''") if s else ""

def main():
    print("-- Auto-generated knowledge seed data")
    print("DELETE FROM chat_knowledge;")
    print()

    for brand, path in KNOWLEDGE_FILES.items():
        if not os.path.exists(path):
            print(f"-- SKIP: {path} not found")
            continue

        with open(path) as f:
            data = json.load(f)

        faqs = data.get("faqs", [])
        print(f"-- {brand}: {len(faqs)} FAQs")
        for faq in faqs:
            q = escape_sql(faq.get("q", ""))
            a = escape_sql(faq.get("a", ""))
            cat = escape_sql(faq.get("category", "general"))
            print(f"INSERT INTO chat_knowledge (brand, category, question, answer) VALUES ('{brand}', '{cat}', '{q}', '{a}');")

        # Seasonal highlights
        seasonal = data.get("seasonal_highlights", [])
        if seasonal:
            month = data.get("current_month", 0)
            s_text = f"本月({month}月)當季推薦：{'、'.join(seasonal)}"
            print(f"INSERT INTO chat_knowledge (brand, category, question, answer) VALUES ('{brand}', 'seasonal', NULL, '{escape_sql(s_text)}');")

        print()

    print("-- Done")

if __name__ == "__main__":
    main()
