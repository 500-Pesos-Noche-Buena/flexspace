import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, LifeBuoy } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const NotFound = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 antialiased">
            <div className="w-full max-w-2xl text-center space-y-10">
                
                {/* Large 404 Heading */}
                <div className="space-y-4">
                    <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-muted-foreground/20 select-none">
                        404
                    </h1>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                        Page Not Found
                    </h2>
                </div>

                {/* Shadcn Alert Component */}
                <Alert variant="warning" className="max-w-md mx-auto border-amber-200 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-200">
                    <AlertCircle className="h-5 w-5" stroke="currentColor" />
                    <AlertTitle className="font-bold text-left ml-2">Heads up!</AlertTitle>
                    <AlertDescription className="text-left ml-2 opacity-90">
                        The resource you are looking for might have been moved or deleted from our Iloilo servers.
                    </AlertDescription>
                </Alert>

                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                    It looks like the link you followed is broken. Please try navigating back to the homepage or reach out if you think this is a mistake.
                </p>

                {/* Navigation Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                    <Button asChild size="lg" className="w-full sm:w-auto rounded-full font-bold shadow-lg shadow-primary/20 transition-transform active:scale-95">
                        <Link to="/">
                            <Home className="mr-2 h-4 w-4" />
                            Go to Homepage
                        </Link>
                    </Button>
                    
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-full font-bold transition-colors active:scale-95">
                        <Link to="/contact">
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            Contact Support
                        </Link>
                    </Button>
                </div>

            </div>
        </div>
    );
};