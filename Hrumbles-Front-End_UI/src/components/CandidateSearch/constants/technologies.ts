export interface TechCategory {
  color: string;
  bg: string;
  border: string;
  icon: string;
}

export const TECH_CATS: Record<string, TechCategory> = {
  Languages:       { color: "#3730A3", bg: "#EEF2FF", border: "#C7D2FE", icon: "<>" },
  Frontend:        { color: "#166534", bg: "#F0FDF4", border: "#86EFAC", icon: "◻"  },
  Backend:         { color: "#9A3412", bg: "#FFF7ED", border: "#FED7AA", icon: "⬡"  },
  Databases:       { color: "#1E40AF", bg: "#EFF6FF", border: "#BFDBFE", icon: "⊚"  },
  "Cloud & Infra": { color: "#0C4A6E", bg: "#E0F2FE", border: "#7DD3FC", icon: "△"  },
  DevOps:          { color: "#5B21B6", bg: "#F5F3FF", border: "#DDD6FE", icon: "⟳"  },
  "AI / ML":       { color: "#9F1239", bg: "#FFF1F2", border: "#FCA5A5", icon: "✦"  },
  Data:            { color: "#92400E", bg: "#FFFBEB", border: "#FDE68A", icon: "◈"  },
};

export const TECHS_BY_CAT: Record<string, string[]> = {
  Languages:       ["Python","JavaScript","TypeScript","Java","Go","Rust","C++","C#","Ruby","PHP","Kotlin","Swift","R","Scala","MATLAB"],
  Frontend:        ["React","Vue.js","Angular","Next.js","Svelte","Nuxt.js","Tailwind CSS","GraphQL","Redux","Webpack","Vite"],
  Backend:         ["Node.js","Django","FastAPI","Flask","Spring Boot","Laravel","Express","Ruby on Rails","ASP.NET","Fastify","Gin"],
  Databases:       ["PostgreSQL","MongoDB","MySQL","Redis","Elasticsearch","DynamoDB","Cassandra","Firebase","SQLite","BigQuery","Supabase"],
  "Cloud & Infra": ["AWS","Azure","Google Cloud","Docker","Kubernetes","Terraform","Ansible","Helm","Pulumi","DigitalOcean"],
  DevOps:          ["Jenkins","GitHub Actions","GitLab CI","CircleCI","ArgoCD","Prometheus","Grafana","Datadog","PagerDuty"],
  "AI / ML":       ["TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy","Keras","XGBoost","Hugging Face","LangChain","OpenCV","Transformers"],
  Data:            ["Apache Spark","Airflow","dbt","Tableau","Power BI","Kafka","Flink","Snowflake","Databricks","Looker"],
};

export const ALL_TECHS: string[] = Object.values(TECHS_BY_CAT).flat();

export const TECH_CAT_MAP: Record<string, string> = {};
Object.entries(TECHS_BY_CAT).forEach(([cat, list]) =>
  list.forEach(t => { TECH_CAT_MAP[t] = cat; })
);

/** Maps display name → API technology UID */
export const TECH_UID_MAP: Record<string, string> = {
  "Python":          "python",
  "JavaScript":      "javascript",
  "TypeScript":      "typescript",
  "Java":            "java",
  "Go":              "go",
  "Rust":            "rust",
  "C++":             "c__",
  "C#":              "c_",
  "Ruby":            "ruby",
  "PHP":             "php",
  "Kotlin":          "kotlin",
  "Swift":           "swift",
  "R":               "r",
  "Scala":           "scala",
  "MATLAB":          "matlab",
  "React":           "react",
  "Vue.js":          "vue_js",
  "Angular":         "angular",
  "Next.js":         "next_js",
  "Svelte":          "svelte",
  "Nuxt.js":         "nuxt_js",
  "Tailwind CSS":    "tailwindcss",
  "GraphQL":         "graphql",
  "Redux":           "redux",
  "Webpack":         "webpack",
  "Vite":            "vite",
  "Node.js":         "node_js",
  "Django":          "django",
  "FastAPI":         "fastapi",
  "Flask":           "flask",
  "Spring Boot":     "spring_boot",
  "Laravel":         "laravel",
  "Express":         "express",
  "Ruby on Rails":   "ruby_on_rails",
  "ASP.NET":         "asp_net",
  "Fastify":         "fastify",
  "Gin":             "gin",
  "PostgreSQL":      "postgresql",
  "MongoDB":         "mongodb",
  "MySQL":           "mysql",
  "Redis":           "redis",
  "Elasticsearch":   "elasticsearch",
  "DynamoDB":        "dynamodb",
  "Cassandra":       "cassandra",
  "Firebase":        "firebase",
  "SQLite":          "sqlite",
  "BigQuery":        "bigquery",
  "Supabase":        "supabase",
  "AWS":             "aws",
  "Azure":           "azure",
  "Google Cloud":    "google_cloud",
  "Docker":          "docker",
  "Kubernetes":      "kubernetes",
  "Terraform":       "terraform",
  "Ansible":         "ansible",
  "Helm":            "helm",
  "Pulumi":          "pulumi",
  "DigitalOcean":    "digitalocean",
  "Jenkins":         "jenkins",
  "GitHub Actions":  "github_actions",
  "GitLab CI":       "gitlab",
  "CircleCI":        "circleci",
  "ArgoCD":          "argo",
  "Prometheus":      "prometheus",
  "Grafana":         "grafana",
  "Datadog":         "datadog",
  "PagerDuty":       "pagerduty",
  "TensorFlow":      "tensorflow",
  "PyTorch":         "pytorch",
  "Scikit-learn":    "scikit_learn",
  "Pandas":          "pandas",
  "NumPy":           "numpy",
  "Keras":           "keras",
  "XGBoost":         "xgboost",
  "Hugging Face":    "huggingface",
  "LangChain":       "langchain",
  "OpenCV":          "opencv",
  "Transformers":    "huggingface",
  "Apache Spark":    "apache_spark",
  "Airflow":         "apache_airflow",
  "dbt":             "dbt",
  "Tableau":         "tableau",
  "Power BI":        "microsoft_power_bi",
  "Kafka":           "apache_kafka",
  "Flink":           "apache_flink",
  "Snowflake":       "snowflake",
  "Databricks":      "databricks",
  "Looker":          "looker",
};

export const toTechUids = (displayNames: string[]): string[] =>
  displayNames.map(n => TECH_UID_MAP[n]).filter((uid): uid is string => Boolean(uid));