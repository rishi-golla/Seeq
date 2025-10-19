
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import excelIcon from '../../icons/excelicon.png';
import wordIcon from '../../icons/wordicon.svg';

// Define the form schema with Zod
const automationSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt must be less than 1000 characters'),
  documentType: z.enum(['excel', 'word'], {
    required_error: 'Please select a document type',
  }),
});

type AutomationFormData = z.infer<typeof automationSchema>;

export default function Automation() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<AutomationFormData>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      prompt: '',
      documentType: 'excel',
    },
  });

  const onSubmit = (data: AutomationFormData) => {
    console.log('Form submitted with data:', data);
  };

  // Watch form values for real-time updates
  const watchedValues = watch();
  console.log('Current form values:', watchedValues);

  return (
    <div className="w-full h-full p-4 flex flex-col gap-4" style={{ backgroundColor: '#1A1B1F' }}>
      {/* Top row with 2/3 and 1/3 cards */}
      <div className="flex gap-4 h-80">
        {/* First card - 2/3 width - Prompt input */}
        <div className="flex-1 rounded-lg shadow-sm border border-gray-600 p-4 flex flex-col" style={{ backgroundColor: '#1A1B1F' }}>
          <div className="mb-3">
            <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">Prompt</h3>
            <p className="text-xs text-gray-400 mb-3">Describe what document you want to create. Be specific about content, structure, and requirements.</p>
            <div className="text-xs text-gray-500 mb-2">
              <strong>Examples:</strong> "Create a quarterly sales report with revenue charts and growth analysis" | "Generate a project proposal with timeline, budget, and team structure"
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col">
              <textarea
                id="prompt"
                {...register('prompt')}
                className="flex-1 w-full px-3 py-3 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-white placeholder-gray-400 bg-gray-800 text-sm"
                placeholder="e.g., Create a monthly budget report with expense categories and variance analysis..."
              />
              {errors.prompt && (
                <p className="mt-1 text-xs text-red-400">{errors.prompt.message}</p>
              )}
            </div>
          </form>
        </div>

        {/* Second card - 1/3 width - Document type selection */}
        <div className="w-1/3 rounded-lg shadow-sm border border-gray-600 p-4 flex flex-col" style={{ backgroundColor: '#1A1B1F' }}>
          <div className="mb-3">
            <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">Format</h3>
            <p className="text-xs text-gray-400">Choose the output format for your document.</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-evenly">
            {/* Excel Option */}
            <label htmlFor="excel" className="cursor-pointer">
              <input
                id="excel"
                type="radio"
                value="excel"
                {...register('documentType')}
                className="hidden peer"
              />
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/30 to-emerald-600/30 rounded-xl opacity-0 peer-checked:opacity-100 transition-opacity duration-300 blur-sm"></div>
                <div className="relative bg-gradient-to-br from-[#2a2d35] to-[#212226] border-2 border-gray-700 peer-checked:border-green-500 rounded-xl p-3 transition-all duration-300 peer-checked:shadow-lg peer-checked:shadow-green-500/30 hover:bg-gradient-to-br hover:from-green-600/30 hover:to-emerald-600/30 peer-checked:hover:bg-gradient-to-br peer-checked:hover:from-[#2a2d35] peer-checked:hover:to-[#212226]">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        watchedValues.documentType === 'excel' 
                          ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 shadow-lg shadow-green-500/30' 
                          : 'bg-gray-700'
                      }`}>
                        <img src={excelIcon} alt="Excel" className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={`text-sm font-semibold transition-colors duration-300 ${
                          watchedValues.documentType === 'excel' ? 'text-green-400' : 'text-gray-300'
                        }`}>Excel</h4>
                      </div>
                      <p className="text-xs text-gray-400 leading-tight">Spreadsheets, data tables, charts</p>
                    </div>
                  </div>
                </div>
              </div>
            </label>
            
            {/* Word Option */}
            <label htmlFor="word" className="cursor-pointer">
              <input
                id="word"
                type="radio"
                value="word"
                {...register('documentType')}
                className="hidden peer"
              />
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-xl opacity-0 peer-checked:opacity-100 transition-opacity duration-300 blur-sm"></div>
                <div className="relative bg-gradient-to-br from-[#2a2d35] to-[#212226] border-2 border-gray-700 peer-checked:border-blue-500 rounded-xl p-3 transition-all duration-300 peer-checked:shadow-lg peer-checked:shadow-blue-500/30 hover:bg-gradient-to-br hover:from-blue-600/30 hover:to-indigo-600/30 peer-checked:hover:bg-gradient-to-br peer-checked:hover:from-[#2a2d35] peer-checked:hover:to-[#212226]">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        watchedValues.documentType === 'word' 
                          ? 'bg-gradient-to-br from-blue-600/20 to-indigo-600/20 shadow-lg shadow-blue-500/30' 
                          : 'bg-gray-700'
                      }`}>
                        <img src={wordIcon} alt="Word" className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={`text-sm font-semibold transition-colors duration-300 ${
                          watchedValues.documentType === 'word' ? 'text-blue-400' : 'text-gray-300'
                        }`}>Word</h4>
                      </div>
                      <p className="text-xs text-gray-400 leading-tight">Reports, letters, proposals</p>
                    </div>
                  </div>
                </div>
              </div>
            </label>
            
            {errors.documentType && (
              <p className="text-xs text-red-400 mt-2">{errors.documentType.message}</p>
            )}
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
          >
            Generate Document
          </button>
        </div>
      </div>

      {/* Bottom card - Full width - Output display */}
      <div className="flex-1 rounded-lg shadow-sm border border-gray-600 p-4 flex flex-col" style={{ backgroundColor: '#1A1B1F' }}>
        <div className="mb-3">
          <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">Output</h3>
          <p className="text-xs text-gray-400">Your generated document will appear here. Download or copy the content when ready.</p>
        </div>
        <div className="flex-1 bg-gray-800 rounded-md border border-gray-600 p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-700 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">
              Generated document will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}