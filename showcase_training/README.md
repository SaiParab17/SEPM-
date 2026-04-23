# Showcase-Only Training Demo (Not Used by App Runtime)

This folder is only for academic presentation/demo.
It is intentionally separate from the production app flow.

## Chosen Dataset

- Dataset: SQuAD v2.0
- Link: https://huggingface.co/datasets/squad_v2
- Why this dataset:
  - It is a standard question-answering benchmark.
  - Your project is a document Q&A system, so QA data aligns with your use case.
  - It is small enough for a short educational training demo.

## Important Note

- The main project continues to use API-based answering.
- Nothing in this folder is imported by backend/frontend runtime.
- This code is for showcase only.

## Files

- `train_qa_showcase.py`: Demo fine-tuning script on a subset of SQuAD v2.
- `requirements.txt`: Minimal dependencies for this standalone demo.

## Run (Optional)

From repository root:

```powershell
cd showcase_training
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python train_qa_showcase.py
```

## Suggested Viva Statement

"We prepared a separate QA training prototype using SQuAD v2 to demonstrate model training workflow. The deployed application uses API-based inference for stability and latency, while this script showcases our training understanding."
