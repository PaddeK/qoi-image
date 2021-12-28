#define QOI_IMPLEMENTATION
#include "qio.h"
#include <stdio.h>
#include <stdlib.h>
#include <getopt.h>
#include <unistd.h>

void print_usage() {
    printf("Usage: encode -i file -o file -w num -h num -b num [3 - 4] -c num [0 - 1]\n");
    exit(EXIT_FAILURE);
}

int main (int argc, char **argv) {
    int c;
    int option_index = 0;
    int width = -1;
    int height = -1;
    int bpp = -1;
    int cp = 1;
    char *infile = "";
    char *outfile = "";

    while (1) {
        static struct option long_options[] = {
            {"in",         required_argument, 0, 'i'},
            {"out",        required_argument, 0, 'o'},
            {"width",      required_argument, 0, 'w'},
            {"height",     required_argument, 0, 'h'},
            {"bpp",        required_argument, 0, 'b'},
            {"colorspace", required_argument, 0, 'c'},
            {0, 0, 0, 0}
        };

        c = getopt_long (argc, argv, ":i:o:w:h:b:c:", long_options, &option_index);

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
            case 'w':
                width = atoi(optarg);
                break;
            case 'h':
                height = atoi(optarg);
                break;
            case 'b':
                bpp = atoi(optarg);
                break;
            case 'c':
                cp = atoi(optarg);
                break;
            case '?':
            case ':':
            default:
                print_usage();
                abort ();
                return 1;
        }
    }

    if (infile == "" || outfile == "" || width < 1 || height < 1 || bpp < 3 || bpp > 4 || cp < 0 || cp > 1) {
        print_usage();
        return 1;
    }

    if (access(infile, F_OK | R_OK) != 0) {
        puts("Failure reading from input file");
        return 1;
    }

    qoi_desc imgDesc = {
        .width      = width,
        .height     = height,
        .channels   = bpp,
        .colorspace = cp
    };

    FILE *fp = fopen(infile, "rb");
    void* buffer = malloc(imgDesc.width * imgDesc.height * imgDesc.channels);
    fread(buffer, imgDesc.width * imgDesc.height * imgDesc.channels, 1, fp);
    fclose(fp);

    int encodedLength = qoi_write(outfile, buffer, &imgDesc);

    printf("Wrote QOI image (%i bytes)\n", encodedLength);
    free(buffer);

    return 0;
}