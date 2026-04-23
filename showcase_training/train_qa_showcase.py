from datasets import load_dataset
from transformers import (
    AutoModelForQuestionAnswering,
    AutoTokenizer,
    TrainingArguments,
    Trainer,
    default_data_collator,
)

MODEL_NAME = "distilbert-base-uncased"
MAX_LENGTH = 384
DOC_STRIDE = 128
TRAIN_SAMPLES = 2000
VAL_SAMPLES = 400


def prepare_train_features(examples, tokenizer):
    questions = [q.strip() for q in examples["question"]]

    tokenized_examples = tokenizer(
        questions,
        examples["context"],
        truncation="only_second",
        max_length=MAX_LENGTH,
        stride=DOC_STRIDE,
        return_overflowing_tokens=True,
        return_offsets_mapping=True,
        padding="max_length",
    )

    sample_mapping = tokenized_examples.pop("overflow_to_sample_mapping")
    offset_mapping = tokenized_examples.pop("offset_mapping")

    start_positions = []
    end_positions = []

    for i, offsets in enumerate(offset_mapping):
        input_ids = tokenized_examples["input_ids"][i]
        cls_index = input_ids.index(tokenizer.cls_token_id)

        sequence_ids = tokenized_examples.sequence_ids(i)
        sample_index = sample_mapping[i]
        answers = examples["answers"][sample_index]

        if len(answers["answer_start"]) == 0:
            start_positions.append(cls_index)
            end_positions.append(cls_index)
            continue

        start_char = answers["answer_start"][0]
        end_char = start_char + len(answers["text"][0])

        token_start_index = 0
        while sequence_ids[token_start_index] != 1:
            token_start_index += 1

        token_end_index = len(input_ids) - 1
        while sequence_ids[token_end_index] != 1:
            token_end_index -= 1

        if not (offsets[token_start_index][0] <= start_char and offsets[token_end_index][1] >= end_char):
            start_positions.append(cls_index)
            end_positions.append(cls_index)
        else:
            while token_start_index < len(offsets) and offsets[token_start_index][0] <= start_char:
                token_start_index += 1
            start_positions.append(token_start_index - 1)

            while offsets[token_end_index][1] >= end_char:
                token_end_index -= 1
            end_positions.append(token_end_index + 1)

    tokenized_examples["start_positions"] = start_positions
    tokenized_examples["end_positions"] = end_positions
    return tokenized_examples


def main():
    print("Loading SQuAD v2 dataset...")
    ds = load_dataset("squad_v2")

    train_ds = ds["train"].select(range(TRAIN_SAMPLES))
    val_ds = ds["validation"].select(range(VAL_SAMPLES))

    print(f"Train subset: {len(train_ds)} examples")
    print(f"Validation subset: {len(val_ds)} examples")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForQuestionAnswering.from_pretrained(MODEL_NAME)

    print("Tokenizing...")
    tokenized_train = train_ds.map(
        lambda x: prepare_train_features(x, tokenizer),
        batched=True,
        remove_columns=train_ds.column_names,
    )

    tokenized_val = val_ds.map(
        lambda x: prepare_train_features(x, tokenizer),
        batched=True,
        remove_columns=val_ds.column_names,
    )

    args = TrainingArguments(
        output_dir="./qa_showcase_model",
        learning_rate=2e-5,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        num_train_epochs=1,
        weight_decay=0.01,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        logging_steps=50,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized_train,
        eval_dataset=tokenized_val,
        tokenizer=tokenizer,
        data_collator=default_data_collator,
    )

    print("Starting showcase training...")
    trainer.train()

    print("Evaluating...")
    metrics = trainer.evaluate()
    print("Evaluation metrics:")
    for key, value in metrics.items():
        print(f"  {key}: {value}")

    trainer.save_model("./qa_showcase_model/final")
    tokenizer.save_pretrained("./qa_showcase_model/final")

    print("Done. Showcase model saved in ./qa_showcase_model/final")
    print("Note: This script is for demonstration and not used by your running backend.")


if __name__ == "__main__":
    main()
