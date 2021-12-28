#define QOI_IMPLEMENTATION
#include "qio.h"
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <unistd.h>

void print_usage() {
    printf("Usage: decode -i file -o file -b num [3 - 4]\n");
    exit(EXIT_FAILURE);
}

int main (int argc, char **argv) {
    int c;
    int option_index = 0;
    int bpp = -1;
    char *infile = "";
    char *outfile = "";

    while (1) {
        static struct option long_options[] = {
            {"in",  required_argument, 0, 'i'},
            {"out", required_argument, 0, 'o'},
            {"bpp", required_argument, 0, 'b'},
            {0, 0, 0, 0}
        };

        c = getopt_long (argc, argv, ":i:o:b:", long_options, &option_index);

        if (c == -1) {
            break;
        }

        switch (c) {
            case 'i':
                infile = optarg;
                break;
            case 'o':
                outfile = optarg;
                break;
            case 'b':
                bpp = atoi(optarg);
                break;
            case '?':
            case ':':
            default:
                print_usage();
                abort ();
                return 1;
        }
    }

    if (infile == "" || outfile == "" || bpp < 3 || bpp > 4) {
        print_usage();
        return 1;
    }

    if (access(infile, F_OK | R_OK) != 0) {
        puts("Failure reading from input file");
        return 1;
    }

    qoi_desc imgDesc;

    void* decodedImage = qoi_read(infile, &imgDesc, bpp);
    int decodedLength = imgDesc.width * imgDesc.height * bpp;

    FILE* fp = fopen(outfile, "wb");
    fwrite(decodedImage, 1, decodedLength, fp);
    fclose(fp);

    printf("Wrote decoded QOI image (%i bytes)\n", decodedLength);

    return 0;
}