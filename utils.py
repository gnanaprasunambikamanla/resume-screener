from rapidfuzz import fuzz, process

# Canonical mapping for common skills
SKILL_SYNONYMS = {
    "sql": ["mysql", "postgresql", "sqlite", "mariadb"],
    "nosql": ["mongodb", "cassandra", "dynamodb", "couchdb"],
    "ml": ["machine learning", "ml", "ai"],
    "nlp": ["natural language processing", "text analytics"],
    "frontend": ["react", "vue", "angular", "html", "css", "javascript"],
    "backend": ["fastapi", "django", "flask", "node.js"],
    # add more as needed
}

def normalize_skills(skills):
    """Normalize and unify related skill names."""
    normalized = set()
    skills = [s.lower().strip() for s in skills]
    for skill in skills:
        matched = False
        for canonical, variants in SKILL_SYNONYMS.items():
            if skill == canonical or skill in variants:
                normalized.add(canonical)
                matched = True
                break
        if not matched:
            normalized.add(skill)
    return list(normalized)

def fuzzy_expand_skills(skills, jd_text, threshold=85):
    """
    Detect approximate or implied skills from job description.
    E.g. SQL <-> MySQL, NoSQL <-> MongoDB.
    """
    # all_known = set(sum(SKILL_SYNONYMS.values(), [])) | set(SKILL_SYNONYMS.keys())
    # jd_text_lower = jd_text.lower()
    # jd_terms = [t for t in all_known if t in jd_text_lower]

    # matched = []
    # for skill in skills:
    #     match, score = process.extractOne(skill, jd_terms, scorer=fuzz.token_set_ratio)
    #     if score >= threshold:
    #         matched.append(match)
    # return list(set(skills + matched))


    # Guard against empty inputs
    if not skills or not jd_text:
        return skills

    all_known = set(sum(SKILL_SYNONYMS.values(), [])) | set(SKILL_SYNONYMS.keys())
    jd_text_lower = jd_text.lower()
    jd_terms = [t for t in all_known if t in jd_text_lower]

    # If no terms found in job description, return original skills
    if not jd_terms:
        return skills

    matched = []
    for skill in skills:
        try:
            # Handle case when no matches found
            result = process.extractOne(skill, jd_terms, scorer=fuzz.token_set_ratio)
            if result:  # Check if match was found
                match, score, _ = result
                if score >= threshold:
                    matched.append(match)
        except Exception as e:
            # Log error but continue processing other skills
            print(f"Error matching skill '{skill}': {str(e)}")
            continue

    # Return unique set of original + matched skills
    return list(set(skills + matched))