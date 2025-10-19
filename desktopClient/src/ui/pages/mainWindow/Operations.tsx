
import { useState, useEffect } from 'react';

interface OperationLog {
    timestamp: string;
    operation: string;
    path: string;
}

export default function Operations() {
    const [operations, setOperations] = useState<OperationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadOperations = async () => {
            try {
                setLoading(true);
                const data = await window.electron.getOperationsLog();
                setOperations(data);
                setError(null);
            } catch (err) {
                console.error('Error loading operations log:', err);
                setError('Failed to load operations log');
            } finally {
                setLoading(false);
            }
        };

        loadOperations();
    }, []);

    const getRelativeTime = (timestamp: string) => {
        try {
            const now = new Date();
            const date = new Date(timestamp);
            const diffInMs = now.getTime() - date.getTime();
            const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
            const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
            const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
            const diffInMonths = Math.floor(diffInDays / 30);

            if (diffInMinutes < 1) {
                return 'Just now';
            } else if (diffInMinutes < 60) {
                return `${diffInMinutes} mins ago`;
            } else if (diffInHours < 24) {
                return `${diffInHours} hrs ago`;
            } else if (diffInDays === 1) {
                return 'Yesterday';
            } else if (diffInDays < 7) {
                return `${diffInDays} days ago`;
            } else if (diffInMonths < 1) {
                return `${diffInDays} days ago`;
            } else if (diffInMonths === 1) {
                return '1 month ago';
            } else {
                return `${diffInMonths} months ago`;
            }
        } catch {
            return 'Unknown';
        }
    };

    const getOperationColor = (operation: string) => {
        switch (operation) {
            case 'OPEN':
                return 'text-blue-400';
            case 'DELETE':
                return 'text-red-400';
            case 'LIST_TREE':
                return 'text-green-400';
            case 'SCREEN_AGENT':
                return 'text-purple-400';
            default:
                return 'text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="text-gray-400">Loading operations...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex justify-center items-center">
                <div className="text-red-400 bg-red-400/20 border border-red-400/40 px-4 py-2 rounded-lg">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-600/50 flex-shrink-0">
                <h1 className="text-2xl font-semibold text-white">Operations History</h1>
                <p className="text-sm text-gray-400 mt-1">
                    {operations.length} operations recorded
                </p>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto my-scroll">
                <table className="w-full">
                    <thead className="bg-[#1A1B1F] sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Time
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Action
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                File Path
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-[#141518] divide-y divide-gray-600/30">
                        {operations.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center">
                                        <div className="text-4xl mb-2">📋</div>
                                        <p className="text-lg font-medium">No Operations Found</p>
                                        <p className="text-sm">Operations will appear here as they happen</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            operations.slice().reverse().map((operation, index) => {
                                const relativeTime = getRelativeTime(operation.timestamp);
                                return (
                                    <tr key={index} className="hover:bg-[#212226] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-white">
                                                {relativeTime}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-sm font-medium ${getOperationColor(operation.operation)}`}>
                                                {operation.operation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-300 font-mono break-all">
                                                {operation.path}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}