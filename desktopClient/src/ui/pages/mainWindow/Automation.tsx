
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');

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
    setIsGenerating(true);
    setError('');
    setOutput('');

    try {
      const result = await window.electron.createDocument(data.prompt, data.documentType);
      setOutput(result);
    } catch (err) {
      console.error('Error creating document:', err);
      setError('Failed to create document. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800"
              />
              <label htmlFor="excel" className="ml-3 block text-sm font-medium text-gray-300">
                Excel
              </label>
                      </div>
            <div className="text-xs text-gray-500 ml-7 mb-3">Spreadsheets, data tables, charts, calculations</div>
            
            <div className="flex items-center">
              <input
                id="word"
                type="radio"
                value="word"
                {...register('documentType')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800"
              />
              <label htmlFor="word" className="ml-3 block text-sm font-medium text-gray-300">
                Word
              </label>
                      </div>
            <div className="text-xs text-gray-500 ml-7 mb-3">Reports, letters, proposals, formatted text</div>
            
            {errors.documentType && (
              <p className="text-xs text-red-400">{errors.documentType.message}</p>
            )}
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isGenerating}
            className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Generating...
              </>
            ) : (
              'Generate Document'
            )}
          </button>
        </div>
      </div>

      {/* Bottom card - Full width - Output display */}
      <div className="flex-1 rounded-lg shadow-sm border border-gray-600 p-4 flex flex-col" style={{ backgroundColor: '#1A1B1F' }}>
        <div className="mb-3">
          <h3 className="text-lg font-medium text-white mb-1">Output</h3>
          <p className="text-xs text-gray-400">
            {isGenerating 
              ? 'Generating your document...' 
              : output 
                ? 'Document generated successfully!' 
                : 'Your generated document will appear here. Download or copy the content when ready.'
            }
          </p>
        </div>
        <div className="flex-1 bg-gray-800 rounded-md border border-gray-600 p-4 flex flex-col">
          {isGenerating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-blue-600 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
                <p className="text-gray-400 text-sm">Generating document...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-red-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          ) : output ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-gray-900 rounded-md p-4 overflow-y-auto">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                  {output}
                </pre>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(output)}
                  className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setOutput('')}
                  className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
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