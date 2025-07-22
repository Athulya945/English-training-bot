import { Listbox } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

const modelOptions = [
  { value: "query", label: "Query AI" },
  { value: "training", label: "Training AI" },
];

type ModelOption = "query" | "training";

interface ModelSelectorProps {
  selectedModel: ModelOption;
  setSelectedModel: (value: ModelOption) => void;
}

export default function ModelSelector({ selectedModel, setSelectedModel }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="hidden md:block text-sm text-gray-600">Choose Assistant</label>
      <div className="relative">
        <Listbox value={selectedModel} onChange={setSelectedModel}>
          <Listbox.Button className="px-3 py-1 border rounded-full bg-white text-black flex items-center gap-1 text-sm shadow-sm transition-all duration-300 hover:shadow-[0_0_6px_2px_rgba(106,27,154,0.25)] focus:outline-none focus:ring-2 focus:ring-purple-500">
            {modelOptions.find((opt) => opt.value === selectedModel)?.label}
            <ChevronDownIcon className="w-4 h-4 text-gray-500" />
          </Listbox.Button>
          <Listbox.Options className="absolute mt-1 z-10 bg-white border rounded shadow text-xs">
            {modelOptions.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value as ModelOption}
                className={({ active, selected }) =>
                  `cursor-pointer px-3 py-1 ${selected
                    ? 'bg-purple-700 text-white font-semibold'
                    : active
                    ? 'text-black font-bold shadow-[0_0_6px_2px_rgba(106,27,154,0.25)]'
                    : 'text-gray-900'
                  }`
                }
              >
                {option.label}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Listbox>
      </div>
    </div>
  );
}
